const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const homeController = require("../src/controllers/homeController");
const Post = require("../src/models/post");
const upload = require("../src/config/upload");
const EmailSubscriber = require("../src/models/emailSubscriber");
const {
  sendWelcomeEmail,
  notifyAdminNewSubscriber,
  sendNewsletter
} = require("../src/modules/mailer/mailer");

/* =========================
   ADMIN MIDDLEWARE
========================= */
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.redirect("/login");
}

/* =========================
   VALID OBJECT ID CHECK
========================= */
function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/* =========================
   LOGIN PAGE
========================= */
router.get("/login", (req, res) => {
  res.render("login", { error: null });
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    req.session.isAdmin = true;
    return res.redirect("/admin");
  }
  return res.render("login", { error: "Invalid username or password" });
});

/* =========================
   LOGOUT
========================= */
router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

/* =========================
   HOME
========================= */
router.get("/", homeController.home);

/* =========================
   CATEGORY PAGE
========================= */
router.get("/category/:category", homeController.categoryPosts);

/* =========================
   SINGLE POST
========================= */
router.get("/news/:slug", homeController.singlePost);

/* =========================
   SUBSCRIBE
========================= */
router.post("/subscribe", async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    const existing = await EmailSubscriber.findOne({
      email: email.toLowerCase()
    });

    if (existing) {
      return res.status(200).json({ message: "You are already subscribed!" });
    }

    await EmailSubscriber.create({
      email: email.toLowerCase(),
      name: name || ""
    });

    // Send welcome email to subscriber (non-blocking)
    try {
  console.log("Attempting to send welcome email...");
  await sendWelcomeEmail(email, name);
  console.log("Welcome email sent successfully.");
} catch (err) {
  console.error("FULL WELCOME EMAIL ERROR:");
  console.error(err);
}

    // Notify admin of new subscriber (non-blocking)
   try {
  console.log("Attempting to send admin notification...");
  await notifyAdminNewSubscriber(email, name);
  console.log("Admin notification sent successfully.");
} catch (err) {
  console.error("FULL ADMIN NOTIFICATION ERROR:");
  console.error(err);
}

    res.status(200).json({ message: "Successfully subscribed! Check your email." });

  } catch (err) {
    console.error("SUBSCRIBE ERROR:", err.message);
    res.status(500).json({ error: "Subscription failed. Please try again." });
  }
});

/* =========================
   UNSUBSCRIBE
========================= */
router.get("/unsubscribe", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.send("Invalid unsubscribe link.");

    await EmailSubscriber.findOneAndDelete({ email: email.toLowerCase() });

    res.send(`
      <div style="font-family:Arial,sans-serif;text-align:center;padding:60px;">
        <h2>You have been unsubscribed.</h2>
        <p>You will no longer receive emails from VOXARIA.</p>
        <a href="/" style="color:#007bff;">Return to VOXARIA</a>
      </div>
    `);
  } catch (err) {
    console.error("UNSUBSCRIBE ERROR:", err.message);
    res.status(500).send("Error processing unsubscribe.");
  }
});

/* =========================
   ADMIN DASHBOARD
========================= */
router.get("/admin", requireAdmin, async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).lean();
    const subscriberCount = await EmailSubscriber.countDocuments();
    res.render("admin", { posts, subscriberCount, currentPage: "Admin" });
  } catch (err) {
    console.error("ADMIN ERROR:", err.message);
    res.status(500).send("Server Error");
  }
});

/* =========================
   CREATE POST
========================= */
router.post(
  "/admin/create",
  requireAdmin,
  upload.fields([
    { name: "thumbnailFile", maxCount: 1 },
    { name: "mainImageFile", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const title = req.body?.title;
      if (!title) return res.status(400).send("Title is required");

      const slug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const thumbnail = req.files?.thumbnailFile
        ? "/uploads/" + req.files.thumbnailFile[0].filename
        : req.body.thumbnail || "";

      const mainImage = req.files?.mainImageFile
        ? "/uploads/" + req.files.mainImageFile[0].filename
        : req.body.mainImage || "";

      await Post.create({
        title,
        slug,
        content:    req.body.content  || "",
        category:   req.body.category || "News",
        author:     req.body.author   || "Admin",
        thumbnail,
        mainImage,
        isBreaking: req.body.isBreaking === "on",
        published:  false
      });

      res.redirect("/admin");
    } catch (err) {
      console.error("CREATE ERROR:", err.message);
      res.status(500).send("Error creating post");
    }
  }
);

/* =========================
   EDIT PAGE (GET)
========================= */
router.get("/admin/edit/:id", requireAdmin, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      console.log("Invalid ID for edit:", req.params.id);
      return res.redirect("/admin");
    }
    const post = await Post.findById(req.params.id).lean();
    if (!post) return res.redirect("/admin");
    res.render("edit", { post });
  } catch (err) {
    console.error("EDIT GET ERROR:", err.message);
    res.status(500).send("Server Error");
  }
});

/* =========================
   UPDATE POST (POST)
========================= */
router.post(
  "/admin/edit/:id",
  requireAdmin,
  upload.fields([
    { name: "thumbnailFile", maxCount: 1 },
    { name: "mainImageFile", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.redirect("/admin");

      const post = await Post.findById(req.params.id);
      if (!post) return res.redirect("/admin");

      const slug = (req.body.title || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      post.title      = req.body.title;
      post.slug       = slug;
      post.author     = req.body.author;
      post.category   = req.body.category;
      post.content    = req.body.content;
      post.isBreaking = req.body.isBreaking === "on";

      post.thumbnail = req.files?.thumbnailFile
        ? "/uploads/" + req.files.thumbnailFile[0].filename
        : req.body.thumbnail || post.thumbnail;

      post.mainImage = req.files?.mainImageFile
        ? "/uploads/" + req.files.mainImageFile[0].filename
        : req.body.mainImage || post.mainImage;

      await post.save();
      res.redirect("/admin");
    } catch (err) {
      console.error("UPDATE ERROR:", err.message);
      res.status(500).send("Error updating post");
    }
  }
);

/* =========================
   PUBLISH POST
========================= */
router.post("/admin/publish/:id", requireAdmin, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.redirect("/admin");
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { published: true },
      { new: true }
    );
    if (!post) {
      console.error("PUBLISH: post not found", req.params.id);
      return res.redirect("/admin");
    }
    res.redirect("/admin");
  } catch (err) {
    console.error("PUBLISH ERROR:", err.message);
    res.status(500).send("Error publishing post");
  }
});

/* =========================
   UNPUBLISH POST
========================= */
router.post("/admin/unpublish/:id", requireAdmin, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.redirect("/admin");
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { published: false },
      { new: true }
    );
    if (!post) {
      console.error("UNPUBLISH: post not found", req.params.id);
      return res.redirect("/admin");
    }
    res.redirect("/admin");
  } catch (err) {
    console.error("UNPUBLISH ERROR:", err.message);
    res.status(500).send("Error unpublishing post");
  }
});

/* =========================
   DELETE POST
========================= */
router.get("/admin/delete/:id", requireAdmin, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.redirect("/admin");
    await Post.findByIdAndDelete(req.params.id);
    res.redirect("/admin");
  } catch (err) {
    console.error("DELETE ERROR:", err.message);
    res.status(500).send("Error deleting post");
  }
});

/* =========================
   SEND NEWSLETTER
========================= */
router.post("/admin/newsletter/:id", requireAdmin, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.redirect("/admin");

    const post = await Post.findById(req.params.id).lean();
    if (!post) return res.status(404).send("Post not found");

    const subscribers = await EmailSubscriber.find().lean();
    if (subscribers.length === 0) {
      return res.send(`
        <div style="font-family:Arial;text-align:center;padding:60px;">
          <h2>No subscribers yet.</h2>
          <a href="/admin" style="color:#007bff;">Back to Admin</a>
        </div>
      `);
    }

    // Send in background — don't wait
    sendNewsletter(subscribers, post).catch(err =>
      console.error("Newsletter error:", err.message)
    );

    console.log(`Newsletter sending to ${subscribers.length} subscribers for: ${post.title}`);
    res.redirect("/admin");

  } catch (err) {
    console.error("NEWSLETTER ERROR:", err.message);
    res.status(500).send("Error sending newsletter");
  }
});

/* =========================
   ADMIN — VIEW SUBSCRIBERS
========================= */
router.get("/admin/subscribers", requireAdmin, async (req, res) => {
  try {
    const subscribers = await EmailSubscriber.find()
      .sort({ createdAt: -1 })
      .lean();
    res.render("subscribers", { subscribers });
  } catch (err) {
    console.error("SUBSCRIBERS ERROR:", err.message);
    res.status(500).send("Server Error");
  }
});

/* =========================
   LIVE POSTS API
========================= */
router.get("/api/posts/latest", async (req, res) => {
  try {
    const posts = await Post.find({ published: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json(posts);
  } catch (err) {
    console.error("LIVE POSTS ERROR:", err.message);
    res.status(500).json({ error: "Failed to load posts" });
  }
});

/* =========================
   DEBUG CATEGORIES
========================= */
router.get("/debug/categories", async (req, res) => {
  try {
    const categories = await Post.distinct("category");
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
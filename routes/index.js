const express = require("express");
const router = express.Router();

const homeController = require("../src/controllers/homeController");
const Post = require("../src/models/post");
const upload = require("../src/config/upload");

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
   ADMIN DASHBOARD
   Shows ALL posts (published + drafts)
========================= */
router.get("/admin", requireAdmin, async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).lean();
    res.render("admin", { posts, currentPage: "Admin" });
  } catch (err) {
    console.error("ADMIN ERROR:", err.message);
    res.status(500).send("Server Error");
  }
});

/* =========================
   CREATE POST
   Saved as draft by default
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
        content:    req.body.content    || "",
        category:   req.body.category   || "News",
        author:     req.body.author     || "Admin",
        thumbnail,
        mainImage,
        isBreaking: req.body.isBreaking === "on",
        published:  false  // always start as draft
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
    const mongoose = require("mongoose");

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect("/admin"); // silently skip bad IDs
    }

    const post = await Post.findById(req.params.id).lean();
    if (!post) return res.status(404).send("Post not found");
    res.render("edit", { post });
  } catch (err) {
    console.error("EDIT GET ERROR:", err.message);
    res.status(500).send("Server Error");
  }
});
/* =========================
   PUBLISH POST
   Makes a draft live on public site
========================= */
router.post("/admin/publish/:id", requireAdmin, async (req, res) => {
  try {
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.redirect("/admin");
    await Post.findByIdAndUpdate(req.params.id, { published: true });
    res.redirect("/admin");
  } catch (err) {
    console.error("PUBLISH ERROR:", err.message);
    res.status(500).send("Error publishing post");
  }
});

/* =========================
   UNPUBLISH POST
   Pulls a post back to draft
========================= */
router.post("/admin/unpublish/:id", requireAdmin, async (req, res) => {
  try {
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.redirect("/admin");
    await Post.findByIdAndUpdate(req.params.id, { published: false });
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
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.redirect("/admin");
    await Post.findByIdAndDelete(req.params.id);
    res.redirect("/admin");
  } catch (err) {
    console.error("DELETE ERROR:", err.message);
    res.status(500).send("Error deleting post");
  }
});

/* =========================
   LIVE POSTS API
   Only published posts
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

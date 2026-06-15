const express = require("express");
const router = express.Router();

const homeController = require("../src/controllers/homeController");
const Post = require("../src/models/post")
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
  res.render("login", {
    error: null
  });
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

  return res.render("login", {
    error: "Invalid username or password"
  });
});

/* =========================
   LOGOUT
========================= */
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
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
========================= */
router.get("/admin", requireAdmin, async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .lean();

    res.render("admin", {
      posts,
      currentPage: "Admin"
    });
  } catch (err) {
    console.error("ADMIN ERROR:", err.message);
    res.status(500).send("Server Error");
  }
});

/* =========================
   CREATE POST
========================= */
router.post("/admin/create", async (req, res) => {
  try {
    const title = req.body?.title;

    if (!title) {
      return res.status(400).send("Title is required");
    }

    const postData = {
      title,
      content: req.body?.content || "",
      category: req.body?.category || "News",
      author: req.body?.author || "Admin",
      thumbnail: req.body?.thumbnail || "",
      mainImage: req.body?.mainImage || "",
      isBreaking: req.body?.isBreaking === "on"
    };

    await Post.create(postData);

    return res.redirect("/admin");

  } catch (err) {
    console.log("CREATE ERROR:", err.message);
    return res.status(500).send("Server error");
  }
});
/* =========================
   EDIT PAGE
========================= */
router.post(
  "/edit/:id",
  upload.fields([
    { name: "thumbnailFile", maxCount: 1 },
    { name: "mainImageFile", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const Post = require("../src/models/post")

      const post = await Post.findById(req.params.id);

      if (!post) return res.status(404).send("Post not found");

      // TEXT FIELDS
      post.title = req.body.title;
      post.content = req.body.content;
      post.author = req.body.author;
      post.category = req.body.category;
      post.isBreaking = req.body.isBreaking === "on";

      // IMAGE: THUMBNAIL
      if (req.files?.thumbnailFile) {
        post.thumbnail = "/uploads/" + req.files.thumbnailFile[0].filename;
      } else if (req.body.thumbnail) {
        post.thumbnail = req.body.thumbnail;
      }

      // IMAGE: MAIN
      if (req.files?.mainImageFile) {
        post.mainImage = "/uploads/" + req.files.mainImageFile[0].filename;
      } else if (req.body.mainImage) {
        post.mainImage = req.body.mainImage;
      }

      await post.save();

      res.redirect("/admin/posts");
    } catch (err) {
      console.log(err);
      res.status(500).send("Error updating post");
    }
  }
);

/* =========================
   UPDATE POST
========================= */
router.post("/admin/edit/:id", requireAdmin, async (req, res) => {
  try {
    const slug = (req.body.title || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    await Post.findByIdAndUpdate(req.params.id, {
      title: req.body.title,
      slug,
      author: req.body.author,
      category: req.body.category,
      content: req.body.content,
      thumbnail: req.body.thumbnail,
      mainImage: req.body.mainImage,
      isBreaking: req.body.isBreaking === "on"
    });

    res.redirect("/admin");
  } catch (err) {
    console.error("UPDATE ERROR:", err.message);
    res.status(500).send("Error updating post");
  }
});

/* =========================
   DELETE POST
========================= */
router.get("/admin/delete/:id", requireAdmin, async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    res.redirect("/admin");
  } catch (err) {
    console.error("DELETE ERROR:", err.message);
    res.status(500).send("Error deleting post");
  }
});

/* =========================
   LIVE POSTS API
========================= */
router.get("/api/posts/latest", async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json(posts);
  } catch (err) {
    console.error("LIVE POSTS ERROR:", err.message);
    res.status(500).json({
      error: "Failed to load posts"
    });
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
    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;
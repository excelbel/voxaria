const express = require("express");
const router = express.Router();

const homeController = require("../src/controllers/homeController");
const Post = require("../src/models/post");

/* =========================
   HOME
========================= */
router.get("/", homeController.home);

/* =========================
   CATEGORY POSTS
========================= */
router.get("/category/:category", homeController.categoryPosts);

/* =========================
   SINGLE POST
========================= */
router.get("/news/:slug", homeController.singlePost);

/* =========================
   ADMIN DASHBOARD
========================= */
router.get("/admin", async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .lean();

    res.render("admin", {
      posts: posts || [],
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
    const slug = (req.body.title || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    await Post.create({
      title: req.body.title,
      slug,
      author: req.body.author || "Admin",
      category: req.body.category || "news",
      content: req.body.content || "",
      thumbnail: req.body.thumbnail || "",
      mainImage: req.body.mainImage || "",
      isBreaking: req.body.isBreaking === "on"
    });

    res.redirect("/admin");

  } catch (err) {
    console.error("CREATE ERROR:", err.message);
    res.status(500).send("Error creating post");
  }
});

/* =========================
   EDIT PAGE
========================= */
router.get("/admin/edit/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).lean();

    if (!post) return res.status(404).send("Post not found");

    res.render("edit", {
      post,
      currentPage: "Admin"
    });

  } catch (err) {
    console.error("EDIT GET ERROR:", err.message);
    res.status(500).send("Server Error");
  }
});

/* =========================
   UPDATE POST
========================= */
router.post("/admin/edit/:id", async (req, res) => {
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
router.get("/admin/delete/:id", async (req, res) => {
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
    res.status(500).json({ error: "Failed to load posts" });
  }
});
router.get("/debug/categories", async (req, res) => {
  const categories = await Post.distinct("category");
  res.json(categories);
});
module.exports = router;
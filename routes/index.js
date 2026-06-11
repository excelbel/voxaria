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
      posts,
      role: "admin",
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
    const { title, author, category, content, thumbnail, mainImage } = req.body;

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    await Post.create({
      title,
      slug,
      author,
      category,
      content,
      thumbnail,
      mainImage,
      views: 0,
      createdAt: new Date()
    });

    res.redirect("/admin");
  } catch (err) {
    console.error("CREATE ERROR:", err.message);
    res.status(500).send("Error creating post");
  }
});

/* =========================
   EDIT POST PAGE
========================= */
router.get("/admin/edit/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).lean();

    res.render("edit-post", { post });
  } catch (err) {
    console.error("EDIT LOAD ERROR:", err.message);
    res.status(500).send("Error loading edit page");
  }
});

/* =========================
   UPDATE POST
========================= */
router.post("/admin/edit/:id", async (req, res) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, req.body);
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

module.exports = router;
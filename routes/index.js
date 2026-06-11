
const express = require("express");
const router = express.Router();

const homeController = require("../src/controllers/homeController");
const Post = require("../src/models/post");



/* =========================
   HOME
========================= */
router.get("/", homeController.home);

/* =========================
   SINGLE POST
========================= */
router.get("/news/:slug", homeController.singlePost);

/* =========================
   LIVE POSTS API (NEW)
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

const express = require("express");
const router = express.Router();

const homeController = require("../src/controllers/homeController");

router.get("/", homeController.home);

router.get("/category/:category", homeController.categoryPosts);

router.get("/news/:slug", homeController.singlePost);

router.get("/debug/categories", async (req, res) => {
  const Post = require("../src/models/post");

  const categories = await Post.distinct("category");

  res.json(categories);
});

module.exports = router;


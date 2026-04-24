const express = require("express");
const router = express.Router();

const Post = require("../models/post");

router.get("/", async (req, res) => {
  const posts = await Post.find().sort({ date: -1 }).limit(10);

  res.render("index", {
    posts,
    featuredGrid: [],
    featuredPost: null,
    breakingNews: [],
    currentPage: "home"
  });
});

module.exports = router;
const Post = require("../models/post");
const { getCache, setCache } = require("../services/cacheService");
const { getBreakingNews } = require("../services/aiService");

exports.home = async (req, res) => {
  try {
    let posts = await getCache("home_posts");

    if (!posts) {
      posts = await Post.find()
        .sort({ date: -1 })
        .limit(20)
        .lean();

      await setCache("home_posts", posts);
    }

    const breakingNews = getBreakingNews(posts);

    res.render("index", {
  breakingNews,
  featuredGrid,
  posts,
  recentPosts: recentPosts || [],
  currentPage
});

  } catch (err) {
    console.log(err);
    res.status(500).send("Error");
  }
};
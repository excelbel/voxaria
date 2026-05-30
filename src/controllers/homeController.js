const Post = require("../models/post");
const { getCache, setCache } = require("../services/cacheService");
const { getBreakingNews } = require('../modules/ai/ai.service');

/* =========================
   HOME PAGE CONTROLLER
========================= */
exports.home = async (req, res) => {
  try {
    let posts = await getCache("home_posts");

    if (!posts) {
      posts = await Post.find()
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      await setCache("home_posts", posts, 300);
    }

    // Ensure safe arrays
    const safePosts = Array.isArray(posts) ? posts : [];

    // Featured logic (simple fallback)
    const featuredPost = safePosts[0] || null;
    const featuredGrid = safePosts.slice(1, 5);

    // Recent posts
    const recentPosts = safePosts.slice(0, 10);

    // Trending (basic fallback using views)
    const trendingPosts = [...safePosts]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5);

    // Breaking news (safe call)
    const breakingNews = getBreakingNews(safePosts) || [];

    res.render("index", {
      posts: safePosts,
      featuredPost,
      featuredGrid,
      recentPosts,
      trendingPosts,
      breakingNews,
      randomPost: safePosts[Math.floor(Math.random() * safePosts.length)] || null,
      currentPage: "Home"
    });

  } catch (err) {
    console.error("HOME ERROR:", err.message);

    res.render("index", {
      posts: [],
      featuredPost: null,
      featuredGrid: [],
      recentPosts: [],
      trendingPosts: [],
      breakingNews: [],
      randomPost: null,
      currentPage: "Home"
    });
  }
};
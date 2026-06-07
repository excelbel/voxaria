const Post = require("../models/post");
const { getCache, setCache } = require("../modules/cache/cache.service");
const { getBreakingNews } = require("../modules/ai/ai.service");

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

  await setCache("home_posts", posts, 60); // refresh every 1 min
}

    const safePosts = Array.isArray(posts) ? posts : [];

    const safeFeaturedPost = safePosts[0] || null;
    const safeFeaturedGrid = safePosts.slice(1, 5);
    const recentPosts = safePosts.slice(0, 10);

    const trendingPosts = [...safePosts]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5);

    const breakingNews = getBreakingNews(safePosts) || [];

    const safeRandomPost =
      safePosts[Math.floor(Math.random() * safePosts.length)] || null;

    res.render("index", {
      posts: safePosts,
      safeFeaturedPost,
      safeFeaturedGrid,
      recentPosts,
      trendingPosts,
      breakingNews,
      safeRandomPost,
      currentPage: "Home"
    });

  } catch (err) {
    console.error("HOME ERROR:", err.message);

    res.render("index", {
      posts: [],
      safeFeaturedPost: null,
      safeFeaturedGrid: [],
      recentPosts: [],
      trendingPosts: [],
      breakingNews: [],
      safeRandomPost: null,
      currentPage: "Home"
    });
  }
};

/* =========================
   SINGLE POST PAGE
========================= */
exports.singlePost = async (req, res) => {
  try {
    const post = await Post.findOne({
      slug: req.params.slug
    }).lean();

    if (!post) {
      return res.status(404).send("Post not found");
    }

    await Post.updateOne(
      { _id: post._id },
      { $inc: { views: 1 } }
    );

    const relatedPosts = await Post.find({
      _id: { $ne: post._id }
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    res.render("post", {
      post,
      relatedPosts,
      currentPage: "Post"
    });

  } catch (err) {
    console.error("POST ERROR:", err.message);
    res.status(500).send("Server Error");
  }
};
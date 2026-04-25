const Post = require("../models/post");
const { getCache, setCache } = require("../modules/cache/cache.service");
const { getBreakingNews } = require("../modules/ai/ai.service");
const { buildLayout } = require("../modules/posts/post.service");

exports.home = async (req, res) => {
  try {
    let posts = await getCache("home_posts");

    if (!posts) {
      posts = await Post.find()
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      await setCache("home_posts", posts, 60);
    }

    const breakingNews = getBreakingNews(posts);
    const layout = buildLayout(posts);

    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const paginatedPosts = posts.slice((page - 1) * limit, page * limit);

    res.render("index", {
      breakingNews: breakingNews || [],
      featuredGrid: layout.grid || [],
      featuredPost: layout.hero || null,
      trendingPosts: layout.trending || [],
      posts: paginatedPosts,
      recentPosts: posts.slice(0, 8),
      currentPage: "home",
      page,
      totalPages: Math.ceil(posts.length / limit)
    });

  } catch (err) {
    console.log("HOME ERROR:", err.message);
    res.status(500).send("Server Error");
  }
};
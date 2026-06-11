const Post = require("../../models/post");

/**
 * Get trending posts based on views + recency
 */
async function getTrendingPosts(limit = 5) {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // score = views + recency boost
    const scored = posts.map(p => {
      const ageHours =
        (Date.now() - new Date(p.createdAt)) / (1000 * 60 * 60);

      return {
        ...p,
        score: (p.views || 0) * 2 - ageHours
      };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

  } catch (err) {
    console.log("Trending error:", err.message);
    return [];
  }
}

module.exports = { getTrendingPosts };
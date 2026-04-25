const Post = require("../models/post");

/* =========================
   TIME WEIGHT (FRESHNESS)
========================= */
function getFreshnessScore(post) {
  const created = new Date(post.createdAt || post.date || Date.now()).getTime();
  const ageHours = (Date.now() - created) / 3600000;

  // Strong early boost, decays over time
  return Math.max(0, 60 - ageHours);
}

/* =========================
   ENGAGEMENT SCORE
========================= */
function getEngagementScore(post) {
  const a = post.analytics || {};

  const views = a.views || 0;
  const likes = a.likes || 0;
  const shares = a.shares || 0;

  return (views * 0.1) + (likes * 2) + (shares * 3);
}

/* =========================
   BREAKING NEWS DETECTOR (AI LOGIC)
========================= */
function isBreaking(post) {
  const a = post.analytics || {};

  const highEngagement =
    (a.views || 0) > 500 &&
    (a.shares || 0) > 20;

  const keywordBoost =
    post.title &&
    /(breaking|urgent|just in|alert|update)/i.test(post.title);

  const freshPost =
    new Date(post.createdAt || post.date) > Date.now() - 2 * 3600000;

  return highEngagement || (keywordBoost && freshPost);
}

/* =========================
   FINAL RANK SCORE
========================= */
function calculateScore(post) {
  const freshness = getFreshnessScore(post);
  const engagement = getEngagementScore(post);

  let score = freshness + engagement;

  if (post.isBreaking || isBreaking(post)) {
    score += 100; // BBC-style priority boost
  }

  return score;
}

/* =========================
   MAIN RANKING ENGINE
========================= */
async function getRankedNews(limit = 30) {
  const posts = await Post.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return posts
    .map(post => ({
      ...post,
      score: calculateScore(post),
      breaking: isBreaking(post)
    }))
    .sort((a, b) => b.score - a.score);
}

/* =========================
   HOME PAGE STRUCTURE (BBC STYLE)
========================= */
function buildNewsroomLayout(posts = []) {
  const safe = Array.isArray(posts) ? posts : [];

  const featured = safe[0] || null;

  const breaking = safe.filter(p => p.breaking).slice(0, 5);

  const trending = safe
    .sort((a, b) => (b.analytics?.views || 0) - (a.analytics?.views || 0))
    .slice(0, 8);

  const latest = safe.slice(0, 20);

  const grid = safe.slice(1, 7);

  return {
    featured,
    breaking,
    trending,
    latest,
    grid
  };
}

module.exports = {
  getRankedNews,
  buildNewsroomLayout,
  calculateScore,
  isBreaking
};
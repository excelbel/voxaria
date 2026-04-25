const Post = require("../../models/post");

/* =========================
   SIMPLE CACHE LAYER
========================= */
const cache = {
  posts: [],
  lastUpdated: 0
};

const CACHE_TTL = 30000;

/* =========================
   CATEGORY DETECTOR
========================= */
function detectCategory(text = "") {
  const t = text.toLowerCase();

  if (/(politic|election|government)/.test(t)) return "Politics";
  if (/(sport|match|goal|league)/.test(t)) return "Sports";
  if (/(movie|music|entertainment|celebrity)/.test(t)) return "Entertainment";
  if (/(business|economy|market|finance)/.test(t)) return "Business";
  if (/(breaking|attack|war|crash|urgent)/.test(t)) return "Breaking";

  return "General";
}

/* =========================
   SCORE ENGINE (RANKING SYSTEM)
========================= */
function calculateScore(post) {
  const a = post.analytics || {};

  const views = a.views || 0;
  const likes = a.likes || 0;
  const shares = a.shares || 0;

  const created = new Date(post.createdAt || Date.now()).getTime();
  const ageHours = (Date.now() - created) / 3600000;

  const freshness = Math.max(0, 72 - ageHours);

  const engagement = (views * 0.1) + (likes * 2) + (shares * 3);

  const breakingBoost = post.isBreaking ? 100 : 0;

  return freshness + engagement + breakingBoost;
}

/* =========================
   FETCH POSTS (MAIN ENGINE)
========================= */
async function getNews(limit = 50) {
  const now = Date.now();

  if (cache.posts.length && now - cache.lastUpdated < CACHE_TTL) {
    return cache.posts;
  }

  const posts = await Post.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const enriched = posts.map(p => ({
    ...p,
    category: p.category || detectCategory(`${p.title} ${p.content}`),
    score: calculateScore(p)
  }));

  enriched.sort((a, b) => b.score - a.score);

  cache.posts = enriched;
  cache.lastUpdated = now;

  return enriched;
}

/* =========================
   LAYOUT ENGINE (HOME PAGE STRUCTURE)
========================= */
function buildLayout(posts = []) {
  const safe = Array.isArray(posts) ? posts : [];

  return {
    hero: safe[0] || null,
    breaking: safe.filter(p => p.isBreaking).slice(0, 5),
    trending: [...safe].sort((a, b) => b.score - a.score).slice(0, 8),
    latest: safe.slice(0, 20),
    grid: safe.slice(1, 7)
  };
}

/* =========================
   SINGLE BREAKING CHECK
========================= */
function isBreaking(post) {
  const text = `${post.title || ""} ${post.content || ""}`.toLowerCase();

  const keywords = [
    "breaking",
    "just in",
    "urgent",
    "attack",
    "explosion",
    "war",
    "crash"
  ];

  return keywords.some(k => text.includes(k));
}

module.exports = {
  getNews,
  buildLayout,
  detectCategory,
  calculateScore,
  isBreaking
};
const Post = require("../models/post");

/* =========================
   IN-MEMORY CACHE (REDIS REPLACEMENT)
========================= */
const cache = {
  news: [],
  lastUpdated: 0
};

const CACHE_TTL = 1000 * 30; // 30 seconds

/* =========================
   AI CATEGORY DETECTOR
========================= */
function detectCategory(text = "") {
  const t = text.toLowerCase();

  if (/(politic|election|government)/.test(t)) return "Politics";
  if (/(sport|match|goal|league)/.test(t)) return "Sports";
  if (/(entertainment|movie|music|celebrity)/.test(t)) return "Entertainment";
  if (/(economy|market|stock|finance)/.test(t)) return "Business";
  if (/(war|attack|breaking|crisis)/.test(t)) return "Breaking";

  return "General";
}

/* =========================
   AI HEADLINE SCORE
========================= */
function scorePost(post) {
  const a = post.analytics || {};

  const views = a.views || 0;
  const likes = a.likes || 0;
  const shares = a.shares || 0;

  const created = new Date(post.createdAt || post.date).getTime();
  const ageHours = (Date.now() - created) / 3600000;

  // freshness curve (strong decay after 48h)
  const freshness = Math.max(0, 48 - ageHours);

  // engagement weight
  const engagement = (views * 0.08) + (likes * 2) + (shares * 4);

  // AI boost
  const breakingBoost = post.isBreaking ? 120 : 0;

  return freshness + engagement + breakingBoost;
}

/* =========================
   VIEW SAFETY LAYER (ANTI FAKE TRENDING)
========================= */
function safeViews(post) {
  const views = post.analytics?.views || 0;

  // prevent bot inflation
  return Math.min(views, 10000);
}

/* =========================
   MAIN NEWS FETCHER (CACHE POWERED)
========================= */
async function getNewsV8(limit = 50) {
  const now = Date.now();

  if (cache.news.length && now - cache.lastUpdated < CACHE_TTL) {
    return cache.news;
  }

  const posts = await Post.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const enriched = posts.map(p => ({
    ...p,
    category: p.category || detectCategory(p.title + " " + p.content),
    score: scorePost(p),
    safeViews: safeViews(p)
  }));

  enriched.sort((a, b) => b.score - a.score);

  cache.news = enriched;
  cache.lastUpdated = now;

  return enriched;
}

/* =========================
   HOME LAYOUT ENGINE (BBC STYLE)
========================= */
function buildLayout(posts = []) {
  const safe = Array.isArray(posts) ? posts : [];

  return {
    featured: safe[0] || null,
    breaking: safe.filter(p => p.isBreaking).slice(0, 5),
    trending: [...safe]
      .sort((a, b) => b.safeViews - a.safeViews)
      .slice(0, 8),

    grid: safe.slice(1, 7),
    latest: safe.slice(0, 20)
  };
}

module.exports = {
  getNewsV8,
  buildLayout,
  detectCategory
};
const Post = require("../models/post");

/* =========================
   SOURCE TYPES (ENTERPRISE PIPELINE)
========================= */
const SOURCES = {
  INTERNAL: "INTERNAL",
  API: "API",
  AI_GENERATED: "AI_GENERATED",
  USER_SUBMITTED: "USER_SUBMITTED"
};

/* =========================
   EDITORIAL STATES
========================= */
const STATES = {
  DRAFT: "DRAFT",
  REVIEW: "REVIEW",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED"
};

/* =========================
   IN-MEMORY CACHE LAYER
========================= */
const cache = {
  feed: [],
  lastUpdate: 0
};

const CACHE_TTL = 1000 * 20; // 20s fast newsroom refresh

/* =========================
   AI HEADLINE GENERATOR (SIMULATED)
========================= */
function generateHeadline(post) {
  const title = post.title || "";

  if (post.isBreaking) {
    return `BREAKING: ${title}`;
  }

  if (title.length > 80) {
    return title.slice(0, 77) + "...";
  }

  return title;
}

/* =========================
   AI SUMMARY GENERATOR (LIGHTWEIGHT)
========================= */
function generateSummary(post) {
  const content = (post.content || "").replace(/<[^>]*>/g, "");

  return content.length > 180
    ? content.slice(0, 180) + "..."
    : content;
}

/* =========================
   CONTENT VERIFICATION SCORE
========================= */
function verificationScore(post) {
  let score = 50;

  if (post.source === SOURCES.INTERNAL) score += 30;
  if (post.source === SOURCES.API) score += 20;
  if (post.source === SOURCES.AI_GENERATED) score += 10;

  if (post.verified) score += 30;

  return Math.min(score, 100);
}

/* =========================
   ENGAGEMENT ENGINE
========================= */
function engagementScore(post) {
  const a = post.analytics || {};

  return (a.views || 0) * 0.1 +
         (a.likes || 0) * 2 +
         (a.shares || 0) * 3;
}

/* =========================
   ENTERPRISE NEWS SCORE
========================= */
function enterpriseScore(post) {
  const created = new Date(post.createdAt || post.date).getTime();
  const ageHours = (Date.now() - created) / 3600000;

  const freshness = Math.max(0, 72 - ageHours);

  return (
    freshness +
    engagementScore(post) +
    verificationScore(post) +
    (post.isBreaking ? 100 : 0)
  );
}

/* =========================
   MAIN ENTERPRISE FEED
========================= */
async function getEnterpriseFeed(limit = 80) {
  const now = Date.now();

  if (cache.feed.length && now - cache.lastUpdate < CACHE_TTL) {
    return cache.feed;
  }

  const posts = await Post.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const enriched = posts.map(p => ({
    ...p,

    headline: generateHeadline(p),
    summary: generateSummary(p),

    score: enterpriseScore(p),
    verification: verificationScore(p),

    source: p.source || SOURCES.INTERNAL
  }));

  enriched.sort((a, b) => b.score - a.score);

  cache.feed = enriched;
  cache.lastUpdate = now;

  return enriched;
}

/* =========================
   ENTERPRISE LAYOUT ENGINE
========================= */
function buildEnterpriseLayout(posts = []) {
  const safe = Array.isArray(posts) ? posts : [];

  return {
    hero: safe[0] || null,

    breaking: safe.filter(p => p.isBreaking).slice(0, 5),

    topVerified: safe
      .sort((a, b) => b.verification - a.verification)
      .slice(0, 10),

    trending: safe
      .sort((a, b) => b.score - a.score)
      .slice(0, 12),

    latest: safe.slice(0, 20),

    editorialQueue: safe.filter(p => p.source !== SOURCES.INTERNAL)
  };
}

module.exports = {
  getEnterpriseFeed,
  buildEnterpriseLayout,
  SOURCES,
  STATES
};
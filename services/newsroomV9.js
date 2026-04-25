const Post = require("../models/post");

/* =========================
   GLOBAL NEWS ZONES
========================= */
const ZONES = {
  LOCAL: "LOCAL",
  NATIONAL: "NATIONAL",
  GLOBAL: "GLOBAL"
};

/* =========================
   TIME CYCLE DETECTION
========================= */
function getNewsCycle() {
  const hour = new Date().getHours();

  if (hour < 12) return "MORNING_BOOST";
  if (hour < 18) return "AFTERNOON_STABLE";
  return "EVENING_BREAKING";
}

/* =========================
   ZONE DETECTOR (AI SIMULATION)
========================= */
function detectZone(post) {
  const t = (post.title + " " + post.content).toLowerCase();

  if (/(usa|uk|global|world|international)/.test(t)) {
    return ZONES.GLOBAL;
  }

  if (/(nigeria|lagos|abuja|anambra)/.test(t)) {
    return ZONES.LOCAL;
  }

  return ZONES.NATIONAL;
}

/* =========================
   EDITORIAL PRIORITY SCORE
========================= */
function editorialScore(post) {
  const a = post.analytics || {};

  const views = a.views || 0;
  const likes = a.likes || 0;
  const shares = a.shares || 0;

  const created = new Date(post.createdAt || post.date).getTime();
  const ageHours = (Date.now() - created) / 3600000;

  const freshness = Math.max(0, 72 - ageHours);

  const engagement = (views * 0.1) + (likes * 2.5) + (shares * 4);

  const breakingBoost = post.isBreaking ? 150 : 0;

  return freshness + engagement + breakingBoost;
}

/* =========================
   GLOBAL AMPLIFICATION ENGINE
========================= */
function amplify(post, cycle) {
  let boost = 0;

  if (cycle === "MORNING_BOOST") boost += 10;
  if (cycle === "EVENING_BREAKING") boost += 20;

  if (post.isBreaking) boost += 30;

  if ((post.analytics?.shares || 0) > 50) boost += 40;

  return boost;
}

/* =========================
   STABILITY ENGINE (ANTI FAKE VIRAL)
========================= */
function stabilize(post) {
  const views = post.analytics?.views || 0;

  if (views > 20000) {
    return 20000 + (views * 0.1);
  }

  return views;
}

/* =========================
   MAIN GLOBAL FEED
========================= */
async function getGlobalFeed(limit = 60) {
  const cycle = getNewsCycle();

  const posts = await Post.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const enriched = posts.map(p => {
    const zone = detectZone(p);
    const score = editorialScore(p) + amplify(p, cycle);

    return {
      ...p,
      zone,
      score,
      stableViews: stabilize(p),
      cycle
    };
  });

  return enriched.sort((a, b) => b.score - a.score);
}

/* =========================
   GLOBAL LAYOUT ENGINE (BBC + CNN HYBRID)
========================= */
function buildGlobalLayout(posts = []) {
  const safe = Array.isArray(posts) ? posts : [];

  return {
    hero: safe[0] || null,

    breaking: safe.filter(p => p.isBreaking).slice(0, 5),

    global: safe.filter(p => p.zone === ZONES.GLOBAL).slice(0, 8),

    national: safe.filter(p => p.zone === ZONES.NATIONAL).slice(0, 8),

    local: safe.filter(p => p.zone === ZONES.LOCAL).slice(0, 8),

    trending: [...safe]
      .sort((a, b) => b.stableViews - a.stableViews)
      .slice(0, 10),

    latest: safe.slice(0, 20)
  };
}

module.exports = {
  getGlobalFeed,
  buildGlobalLayout,
  detectZone,
  getNewsCycle
};
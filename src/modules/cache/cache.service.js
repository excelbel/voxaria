const { getRedis } = require("../../config/redis");

/* =========================
   GET CACHE
========================= */
async function getCache(key) {
  try {
    if (!key) return null;

    const redis = getRedis();
    if (!redis) return null;

    const data = await redis.get(key);

    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.log("Cache GET error:", err.message);
    return null;
  }
}

/* =========================
   SET CACHE
========================= */
async function setCache(key, value, ttl = 300) {
  try {
    if (!key || value === undefined) return;

    const redis = getRedis();
    if (!redis) return;

    await redis.setEx(key, ttl, JSON.stringify(value));
  } catch (err) {
    console.log("Cache SET error:", err.message);
  }
}

/* =========================
   DELETE CACHE (IMPORTANT ADDITION)
========================= */
async function deleteCache(key) {
  try {
    const redis = getRedis();
    if (!redis) return;

    await redis.del(key);
  } catch (err) {
    console.log("Cache DELETE error:", err.message);
  }
}

module.exports = {
  getCache,
  setCache,
  deleteCache
};
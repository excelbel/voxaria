let redisClient = null;

async function initRedis() {
  try {
    const redis = require("redis");

    redisClient = redis.createClient({
      url: process.env.REDIS_URL
    });

    redisClient.on("error", () => {
      console.log("Redis offline, using memory cache");
      redisClient = null;
    });

    await redisClient.connect();
    console.log("Redis connected");
  } catch (err) {
    console.log("Redis disabled, running memory cache");
    redisClient = null;
  }
}

const memoryCache = new Map();

async function get(key, fetchFn, ttl = 60) {
  try {
    if (redisClient) {
      const data = await redisClient.get(key);
      if (data) return JSON.parse(data);

      const fresh = await fetchFn();
      await redisClient.setEx(key, ttl, JSON.stringify(fresh));
      return fresh;
    }

    // fallback memory cache
    if (memoryCache.has(key)) return memoryCache.get(key);

    const fresh = await fetchFn();
    memoryCache.set(key, fresh);

    setTimeout(() => memoryCache.delete(key), ttl * 1000);

    return fresh;
  } catch (err) {
    return await fetchFn();
  }
}

module.exports = { initRedis, get };
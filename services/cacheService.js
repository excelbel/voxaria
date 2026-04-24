const { getClient } = require("../config/redis");

async function getCache(key, fetchFn, ttl = 60) {
  const { client, isReady } = getClient();

  try {
    if (isReady && client) {
      const cached = await client.get(key);
      if (cached) return JSON.parse(cached);
    }
  } catch (e) {}

  const fresh = await fetchFn();

  try {
    if (isReady && client) {
      await client.setEx(key, ttl, JSON.stringify(fresh));
    }
  } catch (e) {}

  return fresh;
}

module.exports = getCache;
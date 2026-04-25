const { createClient } = require("redis");

let client = null;
let isConnected = false;

/* =========================
   CONNECT REDIS
========================= */
async function connectRedis() {
  try {
    if (!process.env.REDIS_URL) {
      console.log("Redis URL missing, running without cache");
      return;
    }

    client = createClient({
      url: process.env.REDIS_URL
    });

    client.on("error", (err) => {
      console.log("Redis error:", err.message);
      isConnected = false;
    });

    client.on("connect", () => {
      console.log("Redis connecting...");
    });

    client.on("ready", () => {
      console.log("Redis ready");
      isConnected = true;
    });

    await client.connect();

  } catch (err) {
    console.log("Redis failed, fallback mode active:", err.message);
    client = null;
    isConnected = false;
  }
}

/* =========================
   GET CLIENT SAFELY
========================= */
function getRedis() {
  if (!client || !isConnected) return null;
  return client;
}

/* =========================
   STATUS CHECK
========================= */
function redisStatus() {
  return {
    connected: isConnected,
    active: !!client
  };
}

module.exports = {
  connectRedis,
  getRedis,
  redisStatus
};
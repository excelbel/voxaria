const redis = require("redis");

let client;
let isReady = false;

async function connectRedis() {
  try {
    client = redis.createClient({
      url: process.env.REDIS_URL
    });

    client.on("error", () => {
      console.log("Redis not available, running without cache");
      isReady = false;
    });

    await client.connect();
    isReady = true;

    console.log("Redis connected");
  } catch (err) {
    console.log("Redis disabled");
    isReady = false;
  }
}

function getClient() {
  return { client, isReady };
}

module.exports = { connectRedis, getClient };
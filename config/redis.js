const { createClient } = require("redis");

let client;

async function connectRedis() {
  try {
    client = createClient({
      url: process.env.REDIS_URL
    });

    client.on("error", err => {
      console.log("Redis error:", err.message);
    });

    await client.connect();
    console.log("Redis Connected");

  } catch (err) {
    console.log("Redis failed, fallback mode");
  }
}

function getRedis() {
  return client;
}

module.exports = { connectRedis, getRedis };
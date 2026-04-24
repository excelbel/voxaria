require("dotenv").config();

const app = require("./app");
const mongoose = require("mongoose");
const { connectRedis } = require("./config/redis");

const PORT = process.env.PORT || 10000;

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Connected");

    await connectRedis();

    app.listen(PORT, "0.0.0.0", () => {
      console.log("Voxaria running on", PORT);
    });
  } catch (err) {
    console.log("Startup error:", err);
  }
}

start();
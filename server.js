require("dotenv").config();

const mongoose = require("mongoose");
const http = require("http");
const app = require("./app");
const { Server } = require("socket.io");
const cron = require("node-cron");

const PORT = process.env.PORT || 10000;

const server = http.createServer(app);

/* =========================
   SOCKET.IO SETUP
========================= */
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("join", async () => {
    try {
      const { getNews } = require("./modules/posts/post.service");

      const feed = await getNews(20);

      socket.emit("live-feed", feed);
    } catch (err) {
      console.log("Socket feed error:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

/* =========================
   DATABASE CONNECT + SERVER START
========================= */
async function startServer() {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("MONGODB_URI is missing in environment variables");
    }

    await mongoose.connect(mongoUri);

    console.log("MongoDB Connected");

    const { fetchNewsAndSave } = require("./src/modules/news/news.fetcher");

fetchNewsAndSave();

// Run every 30 minutes
cron.schedule("*/30 * * * *", async () => {
  console.log("Running scheduled news fetch...");
  await fetchNewsAndSave();
});



    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("Server startup error:", err.message);
    process.exit(1);
  }
}

startServer();
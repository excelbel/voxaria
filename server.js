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
   DATABASE + SERVER START
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

    /* =========================
       SAFE NEWS SCHEDULER
       Runs every 6 hours = 4 runs/day
       3 feeds x 4 runs = 12 requests/day
       Well within the 100/day free limit
    ========================= */
    let isFetching = false;

    cron.schedule("0 */6 * * *", async () => {
      if (isFetching) {
        console.log("News fetch already running, skipping...");
        return;
      }

      isFetching = true;

      try {
        console.log("Running scheduled news fetch...");
        await fetchNewsAndSave();
      } catch (err) {
        console.log("News fetch error:", err.message);
      }

      isFetching = false;
    });

    // Run once immediately on startup
    setTimeout(async () => {
      if (isFetching) return;
      isFetching = true;
      try {
        console.log("Running initial news fetch...");
        await fetchNewsAndSave();
      } catch (err) {
        console.log("Initial fetch error:", err.message);
      }
      isFetching = false;
    }, 5000);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("Server startup error:", err.message);
    process.exit(1);
  }
}

startServer();
require("dotenv").config();

const mongoose = require("mongoose");
const http = require("http");
const app = require("./app");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 10000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

/* =========================
   SOCKET LAYER (LIVE NEWS)
========================= */
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
async function start() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI missing in environment");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Connected");

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (err) {
    console.log("Startup error:", err.message);
  }
}

start();
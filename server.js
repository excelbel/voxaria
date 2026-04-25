require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const compression = require("compression");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const Post = require("./models/post");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 10000;
const BASE_URL = process.env.BASE_URL || "https://voxaria.org";

/* =========================
   MONGOOSE
========================= */
mongoose.set("strictQuery", true);

/* =========================
   VIEW ENGINE
========================= */
app.set("view engine", "ejs");
app.set("trust proxy", 1);

app.use(express.static(path.join(__dirname, "public"), {
  maxAge: "1d",
  etag: true
}));

/* =========================
   MIDDLEWARE
========================= */
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "voxaria_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true
    }
  })
);

/* =========================
   GLOBAL LOCALS SAFETY
========================= */
app.use((req, res, next) => {
  res.locals.baseUrl = BASE_URL;

  res.locals.featuredPost = null;
  res.locals.breakingNews = [];
  res.locals.featuredGrid = [];
  res.locals.trendingPosts = [];

  next();
});

/* =========================
   AI HEAT SCORE (V7 CORE)
========================= */
function calculateHeat(post) {
  const a = post.analytics || {};

  const views = a.views || 0;
  const likes = a.likes || 0;
  const shares = a.shares || 0;

  const ageHours =
    (Date.now() - new Date(post.createdAt || post.date).getTime()) /
    3600000;

  const freshness = Math.max(0, 72 - ageHours);

  const engagement = (views * 0.1) + (likes * 2) + (shares * 3);

  return freshness + engagement;
}

/* =========================
   NEWS RANKING ENGINE
========================= */
async function getLiveNews(limit = 50) {
  const posts = await Post.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return posts
    .map(p => ({
      ...p,
      heat: calculateHeat(p),
      isHot: (p.analytics?.views || 0) > 500
    }))
    .sort((a, b) => b.heat - a.heat);
}

/* =========================
   HOME PAGE
========================= */
const {
  getEnterpriseFeed,
  buildEnterpriseLayout
} = require("./services/mediaNetworkV10");

app.get("/", async (req, res) => {
  try {
    const feed = await getEnterpriseFeed(100);

    const layout = buildEnterpriseLayout(feed);

    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const latest = layout.latest;

    const viewData = {
  posts: latest.slice((page - 1) * limit, page * limit),
  featuredPost: layout.hero,
  breakingNews: layout.breaking,
  featuredGrid: layout.featuredGrid || [],
  trendingPosts: layout.trending,
  verifiedPosts: layout.topVerified,
  editorialQueue: layout.editorialQueue,
  recentPosts: latest.slice(0, 8),
  currentPage: "home",
  page,
  totalPages: Math.ceil(latest.length / limit)
};

res.render("index", viewData);
  } catch (err) {
    console.log("V10 ERROR:", err.message);
    res.status(500).send("Server Error");
  }
});
/* =========================
   REAL-TIME SOCKET ENGINE
========================= */
io.on("connection", (socket) => {
  console.log("Newsroom user connected");

  socket.on("join", async () => {
    const { getNewsV8 } = require("./services/newsroomV8");

    const live = await getNewsV8(15);
    socket.emit("live-feed", live);
  });
});

/* =========================
   LIVE NEWS API (FRONTEND POLLING)
========================= */
app.get("/api/live-news", async (req, res) => {
  try {
    const news = await getLiveNews(20);
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: "failed" });
  }
});

/* =========================
   POST PAGE
========================= */
app.get("/post/:slug", async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug }).lean();
    if (!post) return res.status(404).send("Not found");

    const related = await Post.find({
      _id: { $ne: post._id }
    }).limit(5).lean();

    const shareUrl = `${BASE_URL}/post/${post.slug || post._id}`;
    const shareText = post.title;

    res.render("post", {
      post,
      relatedPosts: related,
      shareUrl,
      shareText
    });

  } catch (err) {
    console.log("POST ERROR:", err.message);
    res.status(500).send("Server Error");
  }
});

/* =========================
   START SERVER
========================= */
async function start() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB Connected");

  server.listen(PORT, "0.0.0.0", () => {
    console.log("V7 Newsroom running on", PORT);
  });
}

start();
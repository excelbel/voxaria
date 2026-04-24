require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const compression = require("compression");
const path = require("path");

const Post = require("./models/post");

const app = express();

const PORT = process.env.PORT || 10000;
const BASE_URL = "https://voxaria.org";

/* =========================
   MONGOOSE CONFIG
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
   PERFORMANCE MIDDLEWARE
========================= */
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

/* =========================
   SESSION (SAFE)
========================= */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "voxaria_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  })
);

/* =========================
   GLOBAL SAFETY LOCALS
   (PREVENT ALL EJS CRASHES)
========================= */
app.use((req, res, next) => {
  res.locals.baseUrl = BASE_URL;

  res.locals.featuredPost = null;
  res.locals.featuredGrid = [];
  res.locals.breakingNews = [];
  res.locals.trendingPosts = [];
  res.locals.recentPosts = [];
  res.locals.randomPost = null;

  next();
});

/* =========================
   HOME VIEW ENGINE BUILDER
========================= */
function buildHomeView(posts = []) {
  const safe = Array.isArray(posts) ? posts : [];

  return {
    featuredPost: safe[0] || null,
    breakingNews: safe.slice(0, 5),
    featuredGrid: safe.slice(1, 7),
    trendingPosts: safe.slice(5, 12),
    recentPosts: safe.slice(0, 10),
    latestPosts: safe.slice(0, 20)
  };
}

/* =========================
   HEALTH CHECK
========================= */
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* =========================
   HOME ROUTE (FAST + SAFE)
========================= */
app.get("/", async (req, res) => {
  try {
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const view = buildHomeView(posts);

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const totalPages = Math.ceil(posts.length / limit);

    const paginatedPosts = view.latestPosts.slice(
      (page - 1) * limit,
      page * limit
    );

    const randomPost =
      posts.length > 0
        ? posts[Math.floor(Math.random() * posts.length)]
        : null;

    res.render("index", {
      posts: paginatedPosts,
      featuredPost: view.featuredPost,
      breakingNews: view.breakingNews,
      featuredGrid: view.featuredGrid,
      trendingPosts: view.trendingPosts,
      recentPosts: view.recentPosts,
      randomPost,

      page,
      totalPages,
      currentPage: "home"
    });

  } catch (err) {
    console.log("HOME ERROR:", err.message);
    res.status(500).send("Server Error");
  }
});

/* =========================
   SINGLE POST PAGE
========================= */
app.get("/post/:slug", async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug }).lean();

    if (!post) return res.status(404).send("Not found");

    const relatedPosts = await Post.find({
      _id: { $ne: post._id }
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.render("post", {
      post,
      relatedPosts
    });

  } catch (err) {
    console.log("POST ERROR:", err.message);
    res.status(500).send("Server Error");
  }
});

/* =========================
   START SERVER
========================= */
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB Connected");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on ${PORT}`);
    });

  } catch (err) {
    console.log("Startup Error:", err.message);
    process.exit(1);
  }
}

startServer();
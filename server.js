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
   VIEW ENGINE + STATIC FILES
========================= */
app.set("view engine", "ejs");
app.set("trust proxy", 1);

app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: "1d",
    etag: true
  })
);

/* =========================
   PERFORMANCE MIDDLEWARE
========================= */
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

/* =========================
   SESSION (LIGHTWEIGHT PROD SAFE)
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
   FRONTEND VIEW ENGINE (BBC STYLE)
========================= */
function buildHomeView(posts = []) {
  const safePosts = Array.isArray(posts) ? posts : [];

  return {
    featuredPost: safePosts[0] || null,
    breakingNews: safePosts.slice(0, 5),
    featuredGrid: safePosts.slice(1, 7),
    trendingNews: safePosts.slice(7, 13),
    latestNews: safePosts.slice(0, 20)
  };
}

/* =========================
   GLOBAL SAFE LOCALS (NO EJS CRASHES)
========================= */
app.use((req, res, next) => {
  res.locals.baseUrl = BASE_URL;

  res.locals.featuredPost = null;
  res.locals.featuredGrid = [];
  res.locals.breakingNews = [];
  res.locals.trendingNews = [];

  next();
});

/* =========================
   HEALTH CHECK (RENDER REQUIREMENT)
========================= */
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* =========================
   HOME ROUTE (OPTIMIZED ENGINE)
========================= */
app.get("/", async (req, res) => {
  try {
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const view = buildHomeView(posts);

    res.render("index", {
      posts: view.latestNews,
      featuredPost: view.featuredPost,
      breakingNews: view.breakingNews,
      featuredGrid: view.featuredGrid,
      trendingNews: view.trendingNews,
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
   START SERVER (SAFE BOOT)
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
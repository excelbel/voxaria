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
   PERFORMANCE MIDDLEWARE
========================= */
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.set("view engine", "ejs");
app.set("trust proxy", 1);

app.use(express.static(path.join(__dirname, "public"), {
  maxAge: "1d",
  etag: true
}));

/* =========================
   SESSION (LIGHTWEIGHT)
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
   GLOBAL LOCALS (SAFE DEFAULTS)
========================= */
app.use((req, res, next) => {
  res.locals.baseUrl = BASE_URL;

  // prevent ALL EJS crashes
  res.locals.featuredGrid = [];
  res.locals.breakingNews = [];
  res.locals.trendingNews = [];

  next();
});

/* =========================
   HEALTH CHECK (RENDER REQUIRED)
========================= */
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* =========================
   FAST HOME ROUTE (OPTIMIZED)
========================= */
app.get("/", async (req, res) => {
  try {
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const featuredPost = posts[0] || null; // ✅ FIX ADDED

    const featuredGrid = posts.slice(1, 6);
    const trendingNews = posts.slice(6, 12);
    const breakingNews = posts.slice(0, 5);

    res.render("index", {
      posts,
      featuredPost, // ✅ FIX ADDED
      featuredGrid,
      trendingNews,
      breakingNews,
      currentPage: "home"
    });

  } catch (err) {
    console.log("HOME ERROR:", err.message);
    res.status(500).send("Server Error");
  }
});

app.use((req, res, next) => {
  res.locals.featuredPost = null;
  res.locals.featuredGrid = [];
  res.locals.breakingNews = [];
  res.locals.trendingNews = [];
  next();
});
/* =========================
   POST PAGE (FAST + SAFE)
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
   MONGODB + SERVER START
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
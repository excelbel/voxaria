process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION:", err);
});

require("dotenv").config();

/* =========================
   CORE IMPORTS
========================= */
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");
const slugify = require("slugify");
const compression = require("compression");
const { SitemapStream, streamToPromise } = require("sitemap");
const { google } = require("googleapis");

/* =========================
   MODELS
========================= */
const Post = require("./models/post");
const Subscriber = require("./models/subscriber");

/* =========================
   SERVICES
========================= */
const sendPushNotification = require("./services/pushService");
const { generateSummary } = require("./services/aiService");
const fetchNewsAndSave = require("./services/newsService");
const generateImage = require("./services/imageService");

/* =========================
   INIT APP
========================= */
const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const BASE_URL = "https://voxaria.org";

/* =========================
   OPTIONAL REDIS (SAFE MODE)
========================= */
let redisClient = null;

async function initRedis() {
  try {
    const redis = require("redis");

    redisClient = redis.createClient({
      url: process.env.REDIS_URL
    });

    redisClient.on("error", (err) => {
      console.log("Redis not available, running without cache");
      redisClient = null;
    });

    await redisClient.connect();
    console.log("Redis Connected");
  } catch (err) {
    console.log("Redis disabled");
    redisClient = null;
  }
}

/* =========================
   CACHE HELPER (SAFE)
========================= */
async function cacheGet(key, fetchFn, ttl = 60) {
  if (!redisClient) return await fetchFn();

  try {
    const cached = await redisClient.get(key);
    if (cached) return JSON.parse(cached);

    const fresh = await fetchFn();
    await redisClient.setEx(key, ttl, JSON.stringify(fresh));

    return fresh;
  } catch (err) {
    return await fetchFn();
  }
}

/* =========================
   PERFORMANCE
========================= */
app.use(compression());

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "voxaria_secret",
    resave: false,
    saveUninitialized: false
  })
);

/* =========================
   GLOBAL LOCALS (FIX EJS CRASHES)
========================= */
app.use((req, res, next) => {
  res.locals.baseUrl = BASE_URL;
  res.locals.isAdmin = req.session.isAdmin || false;

  // FIX: prevent undefined errors in EJS
  res.locals.featuredGrid = [];
  res.locals.posts = [];
  res.locals.breakingNews = [];
  res.locals.featuredPost = null;
  res.locals.recentPosts = [];

  next();
});

/* =========================
   HOME PAGE (STABLE)
========================= */
app.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;

    const data = await cacheGet(`home:${page}`, async () => {
      const limit = 10;

      const posts = await Post.find()
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const totalPosts = await Post.countDocuments();

      const featuredPost = await Post.findOne().sort({ date: -1 });
      const featuredGrid = await Post.find().sort({ date: -1 }).skip(1).limit(4);
      const breakingNews = await Post.find().sort({ date: -1 }).limit(5);

      return {
        posts,
        page,
        totalPages: Math.ceil(totalPosts / limit) || 1,
        featuredPost,
        featuredGrid,
        breakingNews
      };
    });

    res.render("index", {
      ...data,
      currentPage: "home"
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
});

/* =========================
   SINGLE POST
========================= */
app.get("/post/:slug", async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug });
    if (!post) return res.status(404).send("Post not found");

    Post.updateOne(
      { _id: post._id },
      { $inc: { "analytics.views": 1 } }
    ).exec();

    const relatedPosts = await Post.find({
      category: post.category,
      _id: { $ne: post._id }
    }).limit(4);

    res.render("post", {
      post,
      relatedPosts: relatedPosts || [],
      currentPage: "post"
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
});

/* =========================
   CREATE POST (SAFE)
========================= */
app.post("/admin/create", async (req, res) => {
  try {
    const slug = slugify(req.body.title + "-" + Date.now(), {
      lower: true,
      strict: true
    });

    const image = await generateImage(req.body.title);

    await Post.create({
      title: req.body.title,
      slug,
      content: req.body.content,
      category: req.body.category,
      mainImage: image,
      thumbnail: image,
      analytics: { views: 0, likes: 0, shares: 0 }
    });

    res.redirect("/admin");
  } catch (err) {
    console.log(err);
    res.status(500).send("Create error");
  }
});

/* =========================
   SERVER START (FIX RENDER ISSUE)
========================= */
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("MongoDB Connected");

    await initRedis();

    fetchNewsAndSave();
    setInterval(fetchNewsAndSave, 30 * 60 * 1000);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on ${PORT}`);
    });
  })
  .catch((err) => console.log(err));
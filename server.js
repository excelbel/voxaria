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
const admin = require("./services/firebase");

/* =========================
   INIT APP
========================= */
const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

/* =========================
   PERFORMANCE MIDDLEWARE
========================= */
app.use(compression());

/* =========================
   VIEW + STATIC
========================= */
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* =========================
   SESSION
========================= */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "voxaria_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
  })
);

/* =========================
   GLOBAL LOCALS (SAFE DEFAULTS)
========================= */
app.use((req, res, next) => {
  res.locals.isAdmin = req.session.isAdmin || false;
  res.locals.baseUrl = BASE_URL;

  res.locals.featuredPost = null;
  res.locals.featuredGrid = [];
  res.locals.breakingNews = [];
  res.locals.recentPosts = [];
  res.locals.trendingPosts = [];
  res.locals.randomPost = null;
  res.locals.currentPage = "";

  next();
});

/* =========================
   SIMPLE CACHE (SIDEBAR)
========================= */
let cachedSidebar = null;
let cacheTime = 0;

async function getSidebarData() {
  const now = Date.now();

  if (cachedSidebar && now - cacheTime < 60 * 1000) {
    return cachedSidebar;
  }

  const randomPost = await Post.aggregate([{ $sample: { size: 1 } }]);

  cachedSidebar = {
    randomPost: randomPost[0] || null,
    recentPosts: await Post.find().sort({ date: -1 }).limit(5),
    trendingPosts: await Post.find()
      .sort({ "analytics.views": -1 })
      .limit(5)
  };

  cacheTime = now;
  return cachedSidebar;
}

/* =========================
   ROUTES
========================= */
app.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments();

    const sidebar = await getSidebarData();

    const featuredPost = await Post.findOne().sort({ date: -1 });

    const featuredGrid = await Post.find()
      .sort({ date: -1 })
      .skip(1)
      .limit(4);

    const breakingNews = await Post.find()
      .sort({ date: -1 })
      .limit(5);

    res.render("index", {
      posts,
      page,
      totalPages: Math.ceil(totalPosts / limit) || 1,

      featuredPost: featuredPost || null,
      featuredGrid: featuredGrid || [],
      breakingNews: breakingNews || [],

      recentPosts: sidebar.recentPosts || [],
      trendingPosts: sidebar.trendingPosts || [],
      randomPost: sidebar.randomPost || null,

      currentPage: "home"
    });
  } catch (err) {
    console.error("HOME ERROR:", err);
    res.status(500).send("Server Error");
  }
});

app.get("/post/:slug", async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug });

    if (!post) return res.status(404).send("Post not found");

    post.analytics = post.analytics || { views: 0, likes: 0, shares: 0 };
    post.analytics.views += 1;
    await post.save();

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
    console.error(err);
    res.status(500).send("Server Error");
  }
});

/* =========================
   ADMIN
========================= */
app.get("/admin", async (req, res) => {
  if (!req.session.isAdmin) return res.render("login");

  const posts = await Post.find().sort({ date: -1 });

  res.render("admin", {
    posts,
    currentPage: "admin"
  });
});

/* =========================
   LOGIN
========================= */
app.post("/login", (req, res) => {
  if (
    req.body.username === process.env.ADMIN_USER &&
    req.body.password === process.env.ADMIN_PASS
  ) {
    req.session.isAdmin = true;
    return res.redirect("/admin");
  }

  res.send("Invalid login");
});

/* =========================
   CREATE POST
========================= */
app.post("/admin/create", async (req, res) => {
  try {
    const post = await Post.create({
      title: req.body.title,
      slug: slugify(req.body.title, { lower: true, strict: true }),
      content: req.body.content,
      category: req.body.category,
      thumbnail: req.body.thumbnail,
      mainImage: req.body.mainImage,
      analytics: { views: 0, likes: 0, shares: 0 }
    });

    const subscribers = await Subscriber.find();
    const tokens = subscribers.map((s) => s.token);

    if (tokens.length) {
      await sendPushNotification(tokens, post);
    }

    res.redirect("/admin");
  } catch (err) {
    console.error(err);
    res.status(500).send("Create error");
  }
});

/* =========================
   AI SUMMARY
========================= */
app.post("/admin/generate-ai-summary/:id", async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (post) {
    post.aiSummary = await generateSummary(post.content);
    await post.save();
  }

  res.redirect("/admin");
});

/* =========================
   API
========================= */
const apiRouter = express.Router();

apiRouter.get("/posts", async (req, res) => {
  const posts = await Post.find().sort({ date: -1 });
  res.json({ success: true, data: posts });
});

app.use("/api/v1", apiRouter);

/* =========================
   SITEMAP (SEO)
========================= */
const { SitemapStream, streamToPromise } = require("sitemap");

app.get("/sitemap.xml", async (req, res) => {
  const posts = await Post.find().select("slug updatedAt");

  const sitemap = new SitemapStream({
    hostname: BASE_URL
  });

  sitemap.write({ url: "/", changefreq: "daily", priority: 1 });

  posts.forEach((post) => {
    sitemap.write({
      url: `/post/${post.slug}`,
      changefreq: "weekly",
      priority: 0.8
    });
  });

  sitemap.end();

  const xml = await streamToPromise(sitemap);

  res.header("Content-Type", "application/xml");
  res.send(xml.toString());
});

/* =========================
   NEWS JOB
========================= */
function startNewsJob() {
  fetchNewsAndSave();
  setInterval(fetchNewsAndSave, 30 * 60 * 1000);
}

/* =========================
   DB + START SERVER
========================= */
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB Connected");

    startNewsJob();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB Error:", err);
  });
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
   OPTIONAL REDIS (SAFE MODE)
========================= */
let redisClient = null;

try {
  const redis = require("redis");

  if (process.env.REDIS_URL) {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL
    });

    redisClient.connect().catch(() => {
      console.log("Redis not available, using memory cache");
      redisClient = null;
    });
  }
} catch (e) {
  console.log("Redis module not active");
}

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
   APP INIT
========================= */
const app = express();
const PORT = process.env.PORT || 3000;

const BASE_URL =
  process.env.BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://voxaria.org"
    : "http://localhost:3000");

/* =========================
   MEMORY CACHE FALLBACK
========================= */
const memoryCache = new Map();

async function cacheGet(key, fetchFn, ttl = 60) {
  try {
    if (redisClient) {
      const cached = await redisClient.get(key);
      if (cached) return JSON.parse(cached);
    }

    const mem = memoryCache.get(key);
    if (mem && mem.expiry > Date.now()) return mem.data;

    const fresh = await fetchFn();

    if (redisClient) {
      await redisClient.setEx(key, ttl, JSON.stringify(fresh));
    }

    memoryCache.set(key, {
      data: fresh,
      expiry: Date.now() + ttl * 1000
    });

    return fresh;
  } catch (e) {
    return await fetchFn();
  }
}

/* =========================
   MIDDLEWARE
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

app.use((req, res, next) => {
  res.locals.baseUrl = BASE_URL;
  res.locals.isAdmin = req.session.isAdmin || false;
  next();
});

/* =========================
   SEO KEYWORDS GENERATOR
========================= */
function generateSEOKeywords(text = "") {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(" ")
    .filter((w) => w.length > 4);

  return [...new Set(words)].slice(0, 12).join(",");
}

/* =========================
   BREAKING NEWS DETECTOR
========================= */
function isBreakingNews(title = "") {
  const triggers = [
    "breaking",
    "urgent",
    "just in",
    "developing",
    "shock",
    "exclusive"
  ];

  return triggers.some((t) => title.toLowerCase().includes(t));
}

/* =========================
   BBC STYLE AI WRITER
========================= */
async function bbcWriter(title, content) {
  const prompt = `
You are a BBC senior news editor.

Rewrite this into a professional global news article:

- strong headline
- journalistic tone
- structured paragraphs
- factual clarity
- no repetition

TITLE: ${title}
CONTENT: ${content}

Return HTML article.
`;

  return await generateSummary(prompt, { mode: "article" });
}

/* =========================
   GOOGLE INDEXING
========================= */
async function pingGoogle(url) {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: "google-key.json",
      scopes: ["https://www.googleapis.com/auth/indexing"]
    });

    const client = await auth.getClient();

    await google.indexing("v3").urlNotifications.publish({
      auth: client,
      requestBody: {
        url,
        type: "URL_UPDATED"
      }
    });
  } catch (e) {
    console.log("Google indexing failed");
  }
}

/* =========================
   HOME (BBC STYLE LAYOUT DATA)
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

      return {
        posts,
        featuredPost: await Post.findOne().sort({ date: -1 }),
        topStories: await Post.find().sort({ "analytics.views": -1 }).limit(5),
        breakingNews: await Post.find().sort({ date: -1 }).limit(5)
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
   POST PAGE
========================= */
app.get("/post/:slug", async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug });
    if (!post) return res.status(404).send("Not found");

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
      relatedPosts
    });
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

/* =========================
   CREATE POST (SEO + IMAGE + AI FLAGS)
========================= */
app.post("/admin/create", async (req, res) => {
  try {
    const slug = slugify(req.body.title + "-" + Date.now(), {
      lower: true
    });

    const image = await generateImage(req.body.title);

    const post = await Post.create({
      title: req.body.title,
      slug,
      content: req.body.content,
      category: req.body.category,
      mainImage: image,
      thumbnail: image,
      seoKeywords: generateSEOKeywords(req.body.content),
      isBreaking: isBreakingNews(req.body.title),
      analytics: { views: 0, likes: 0 }
    });

    await pingGoogle(`${BASE_URL}/post/${slug}`);

    res.redirect("/admin");
  } catch (err) {
    console.log(err);
    res.status(500).send("Create error");
  }
});

/* =========================
   BBC AI REWRITE
========================= */
app.post("/admin/generate-ai-summary/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.redirect("/admin");

    const article = await bbcWriter(post.title, post.content);

    post.content = article;
    post.aiSummary = article.substring(0, 200);

    await post.save();

    await pingGoogle(`${BASE_URL}/post/${post.slug}`);

    res.redirect("/admin");
  } catch (err) {
    console.log(err);
    res.redirect("/admin");
  }
});

/* =========================
   SITEMAP
========================= */
app.get("/sitemap.xml", async (req, res) => {
  const posts = await Post.find().select("slug");

  const sitemap = new SitemapStream({ hostname: BASE_URL });

  sitemap.write({ url: "/", priority: 1 });

  posts.forEach((p) => {
    sitemap.write({
      url: `/post/${p.slug}`,
      priority: 0.8
    });
  });

  sitemap.end();

  const xml = await streamToPromise(sitemap);

  res.header("Content-Type", "application/xml");
  res.send(xml.toString());
});

/* =========================
   NEWS ENGINE
========================= */
function startNewsJob() {
  fetchNewsAndSave();
  setInterval(fetchNewsAndSave, 30 * 60 * 1000);
}

/* =========================
   SERVER START
========================= */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB Connected");

    startNewsJob();

    app.listen(PORT, () => {
      console.log("Server running on", PORT);
    });
  })
  .catch(console.log);
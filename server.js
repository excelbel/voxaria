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
const redis = require("redis");
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
   REDIS CLIENT
========================= */
const redisClient = redis.createClient({
  url: process.env.REDIS_URL
});
redisClient.connect().catch(console.error);

/* =========================
   PERFORMANCE
========================= */
app.use(compression());

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));

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
   GLOBAL LOCALS
========================= */
app.use((req, res, next) => {
  res.locals.baseUrl = BASE_URL;
  res.locals.isAdmin = req.session.isAdmin || false;
  next();
});

/* =========================
   REDIS CACHE HELPER
========================= */
async function cacheGet(key, fetchFn, ttl = 60) {
  const cached = await redisClient.get(key);
  if (cached) return JSON.parse(cached);

  const fresh = await fetchFn();
  await redisClient.setEx(key, ttl, JSON.stringify(fresh));

  return fresh;
}

/* =========================
   BBC STYLE AI WRITER
========================= */
async function bbcWriter(title, content) {
  const prompt = `
Rewrite as BBC-level global news:
- professional tone
- structured journalism
- strong headline
- factual clarity

TITLE: ${title}
CONTENT: ${content}

Return full article in HTML format.
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
  } catch (err) {
    console.log("Google indexing error:", err.message);
  }
}

/* =========================
   HOME PAGE (FAST CACHE)
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

      return {
        posts,
        page,
        totalPages: Math.ceil(totalPosts / limit) || 1,
        featuredPost: await Post.findOne().sort({ date: -1 }),
        featuredGrid: await Post.find().sort({ date: -1 }).skip(1).limit(4),
        breakingNews: await Post.find().sort({ date: -1 }).limit(5)
      };
    });

    res.render("index", { ...data, currentPage: "home" });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
});

/* =========================
   SINGLE POST (FAST VIEW UPDATE)
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

    res.render("post", { post, relatedPosts, currentPage: "post" });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
});

/* =========================
   CREATE POST (AI IMAGE + SEO PING)
========================= */
app.post("/admin/create", async (req, res) => {
  try {
    const slug = slugify(req.body.title + "-" + Date.now(), {
      lower: true,
      strict: true
    });

    const image = await generateImage(req.body.title);

    const post = await Post.create({
      title: req.body.title,
      slug,
      content: req.body.content,
      category: req.body.category,
      mainImage: image,
      thumbnail: image,
      analytics: { views: 0, likes: 0, shares: 0 }
    });

    await pingGoogle(`${BASE_URL}/post/${slug}`);

    res.redirect("/admin");
  } catch (err) {
    console.log(err);
    res.status(500).send("Create error");
  }
});

/* =========================
   BBC AI REWRITE FULL ARTICLE
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
   SITEMAP (SEO CORE)
========================= */
app.get("/sitemap.xml", async (req, res) => {
  const posts = await Post.find().select("slug");

  const sitemap = new SitemapStream({ hostname: BASE_URL });

  sitemap.write({ url: "/", changefreq: "daily", priority: 1 });

  posts.forEach((p) => {
    sitemap.write({
      url: `/post/${p.slug}`,
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
   NEWS AUTO JOB
========================= */
function startNewsJob() {
  fetchNewsAndSave();
  setInterval(fetchNewsAndSave, 30 * 60 * 1000);
}

/* =========================
   START SERVER
========================= */
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB Connected");

    startNewsJob();

    app.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
    });
  })
  .catch((err) => console.log(err));
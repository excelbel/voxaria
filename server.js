process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION:");
  console.log(err);
  console.log(err.stack);
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION:");
  console.log(err);
  console.log(err.stack);
});
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");
const slugify = require("slugify");

const Post = require("./models/post");
const Subscriber = require("./models/subscriber");

const sendPushNotification = require("./services/pushService");
const { generateSummary } = require("./services/aiService");
const fetchNewsAndSave = require("./services/newsService");

const admin = require("firebase-admin");

/* =========================
   INIT APP
========================= */
const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

/* =========================
   FIREBASE INIT
========================= */
const serviceAccount = require("./firebase-service-account.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

/* =========================
   MIDDLEWARE
========================= */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: process.env.SESSION_SECRET || "voxaria_secret",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.set("view engine", "ejs");

/* GLOBAL STATE */
app.use((req, res, next) => {
  res.locals.isAdmin = req.session.isAdmin || false;
  next();
});

/* =========================
   SIDEBAR DATA
========================= */
async function getSidebarData() {
  const randomPost = await Post.aggregate([{ $sample: { size: 1 } }]);

  return {
    randomPost: randomPost[0] || null,
    recentPosts: await Post.find().sort({ date: -1 }).limit(5),
    trendingPosts: await Post.find().sort({ "analytics.views": -1 }).limit(5)
  };
}

/* =========================
   ROUTES
========================= */
app.get("/", async (req, res) => {
  const posts = await Post.find().sort({ date: -1 }).limit(10);
  const sidebar = await getSidebarData();

  res.render("index", { posts, ...sidebar });
});

app.get("/post/:slug", async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug });

  if (!post) return res.status(404).send("Post not found");

  post.analytics = post.analytics || { views: 0, likes: 0, shares: 0 };
  post.analytics.views += 1;

  await post.save();

  res.render("post", { post });
});

/* =========================
   ADMIN
========================= */
app.get("/admin", async (req, res) => {
  if (!req.session.isAdmin) return res.render("login");

  const posts = await Post.find().sort({ date: -1 });
  res.render("admin", { posts });
});

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
  const post = await Post.create({
    title: req.body.title,
    slug: slugify(req.body.title, { lower: true, strict: true }),
    content: req.body.content,
    category: req.body.category,
    thumbnail: req.body.thumbnail || "/images/default-thumb.jpg",
    mainImage: req.body.mainImage || "/images/default-main.jpg",
    analytics: { views: 0, likes: 0, shares: 0 }
  });

  try {
    const subscribers = await Subscriber.find();
    const tokens = subscribers.map(s => s.token);

    if (tokens.length > 0) {
      await sendPushNotification(tokens, post);
    }
  } catch (err) {
  console.error(err.stack || err);
    console.log("Push error:", err.message);
  }

  res.redirect("/admin");
});

/* =========================
   EDIT POST
========================= */
app.get("/admin/edit/:id", async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.send("Post not found");

  res.render("edit", { post });
});

app.post("/admin/edit/:id", async (req, res) => {
  await Post.findByIdAndUpdate(req.params.id, {
    title: req.body.title,
    slug: slugify(req.body.title, { lower: true, strict: true }),
    content: req.body.content,
    category: req.body.category
  });

  res.redirect("/admin");
});

/* =========================
   DELETE POST
========================= */
app.get("/admin/delete/:id", async (req, res) => {
  await Post.findByIdAndDelete(req.params.id);
  res.redirect("/admin");
});

/* =========================
   AI SUMMARY
========================= */
app.post("/admin/generate-ai-summary/:id", async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) return res.redirect("/admin");

  const summary = await generateSummary(post.content);

  post.aiSummary = summary;
  await post.save();

  res.redirect("/admin/edit/" + req.params.id);
});

/* =========================
   ANALYTICS
========================= */
app.get("/admin/analytics", async (req, res) => {
  if (!req.session.isAdmin) return res.redirect("/admin");

  const totalPosts = await Post.countDocuments();

  const stats = await Post.aggregate([
    {
      $group: {
        _id: null,
        views: { $sum: "$analytics.views" },
        likes: { $sum: "$analytics.likes" },
        shares: { $sum: "$analytics.shares" }
      }
    }
  ]);

  const topPosts = await Post.find()
    .sort({ "analytics.views": -1 })
    .limit(10);

  res.render("analytics", {
    totalPosts,
    stats: stats[0] || { views: 0, likes: 0, shares: 0 },
    topPosts
  });
});

/* =========================
   SUBSCRIBE API
========================= */
app.post("/api/v1/subscribe", async (req, res) => {
  const { token } = req.body;

  if (!token) return res.status(400).json({ error: "No token" });

  const exists = await Subscriber.findOne({ token });

  if (!exists) {
    await Subscriber.create({ token });
  }

  res.json({ success: true });
});

/* =========================
   MOBILE API
========================= */
const apiRouter = express.Router();

apiRouter.get("/posts", async (req, res) => {
  const posts = await Post.find().sort({ date: -1 });
  res.json({ success: true, data: posts });
});

apiRouter.post("/posts/:id/like", async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ success: false });

  post.analytics.likes += 1;
  await post.save();

  res.json({ success: true, likes: post.analytics.likes });
});

apiRouter.post("/posts/:id/share", async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ success: false });

  post.analytics.shares += 1;
  await post.save();

  res.json({ success: true });
});

app.use("/api/v1", apiRouter);

/* =========================
   NEWS JOB (SAFE SCHEDULER)
========================= */
function startNewsJob() {
  fetchNewsAndSave(); // run once on startup

  setInterval(() => {
    fetchNewsAndSave();
  }, 30 * 60 * 1000);
}

/* =========================
   CONNECT DB + START SERVER
========================= */
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB Connected");

    startNewsJob();

    app.listen(PORT, () => {
      console.log(`Blog running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
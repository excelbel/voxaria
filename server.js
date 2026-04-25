require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const compression = require("compression");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const slugify = require("slugify");

const Post = require("./models/post");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 10000;
const BASE_URL = process.env.BASE_URL || "https://voxaria.org";

/* =========================
   DB CONFIG
========================= */
mongoose.set("strictQuery", true);

/* =========================
   VIEW ENGINE
========================= */
app.set("view engine", "ejs");
app.set("trust proxy", 1);

/* =========================
   STATIC
========================= */
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: "1d"
}));

/* =========================
   CORE MIDDLEWARE
========================= */
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "newsroom_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true
    }
  })
);

/* =========================
   GLOBAL SAFETY (NO EJS CRASHES EVER)
========================= */
app.use((req, res, next) => {
  res.locals.baseUrl = BASE_URL;

  res.locals.featuredPost = null;
  res.locals.breakingNews = [];
  res.locals.featuredGrid = [];
  res.locals.trendingPosts = [];
  res.locals.recentPosts = [];
  res.locals.randomPost = null;
  res.locals.posts = [];

  next();
});

/* =========================
   NEWSROOM CACHE (SIMPLE PERFORMANCE BOOST)
========================= */
const cache = {
  homepage: null,
  time: 0
};

/* =========================
   SLUG ENGINE
========================= */
const createSlug = (title) =>
  slugify(title, { lower: true, strict: true });

/* =========================
   AUTO FIX OLD POSTS (ONE TIME MIGRATION)
========================= */
async function migrateSlugs() {
  const posts = await Post.find({ $or: [{ slug: null }, { slug: "" }] });

  for (const post of posts) {
    post.slug = createSlug(post.title);
    await post.save();
  }

  console.log(`Migration complete: ${posts.length} posts updated`);
}

/* =========================
   HOME PAGE (NEWSROOM DASHBOARD STYLE)
========================= */
const { getEnterpriseFeed, buildEnterpriseLayout } =
  require("./services/mediaNetworkV10");

app.get("/", async (req, res) => {
  try {
    // simple cache (5 seconds)
    if (cache.homepage && Date.now() - cache.time < 5000) {
      return res.send(cache.homepage);
    }

    const feed = await getEnterpriseFeed(120);
    const layout = buildEnterpriseLayout(feed);

    const page = parseInt(req.query.page) || 1;
    const limit = 12;

    const latest = Array.isArray(layout.latest) ? layout.latest : [];

    const posts = latest.slice((page - 1) * limit, page * limit);

    const data = {
      posts,
      featuredPost: layout.hero || null,
      breakingNews: layout.breaking || [],
      featuredGrid: layout.featuredGrid || [],
      trendingPosts: layout.trending || [],
      recentPosts: latest.slice(0, 10),
      randomPost: latest.length
        ? latest[Math.floor(Math.random() * latest.length)]
        : null,
      currentPage: "home",
      page,
      totalPages: Math.ceil(latest.length / limit)
    };

    const html = await app.render("index", data);

    cache.homepage = html;
    cache.time = Date.now();

    res.send(html);
  } catch (err) {
    console.log("HOME ERROR:", err.message);
    res.status(500).send("Server Error");
  }
});

/* =========================
   LIVE SOCKET NEWS
========================= */
io.on("connection", (socket) => {
  socket.on("join", async () => {
    try {
      const { getNewsV8 } = require("./services/newsroomV8");
      const live = await getNewsV8(20);
      socket.emit("live-feed", live);
    } catch (err) {
      console.log("SOCKET ERROR:", err.message);
    }
  });
});

/* =========================
   LIVE API (FOR WIDGETS / FRONTEND)
========================= */
app.get("/api/live-news", async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "failed" });
  }
});

/* =========================
   NEWS ARTICLE ROUTE (SEO ONLY - NO IDS)
========================= */
app.get("/news/:slug", async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug }).lean();

    if (!post) return res.status(404).send("Article not found");

    const related = await Post.find({
      _id: { $ne: post._id },
      category: post.category
    })
      .limit(6)
      .lean();

    res.render("post", {
      post,
      relatedPosts: related,
      shareUrl: `${BASE_URL}/news/${post.slug}`,
      shareText: post.title
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

/* =========================
   CATEGORY SYSTEM (NEWSROOM SECTIONS)
========================= */
app.get("/category/:category", async (req, res) => {
  try {
    const posts = await Post.find({ category: req.params.category })
      .sort({ createdAt: -1 })
      .lean();

    res.render("category", {
      posts,
      category: req.params.category,
      currentPage: req.params.category
    });
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

/* =========================
   RSS FEED (NEWS DISTRIBUTION)
========================= */
app.get("/rss.xml", async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    let rss = `<?xml version="1.0"?>\n<rss version="2.0"><channel>`;
    rss += `<title>VOXARIA NEWS</title>`;
    rss += `<link>${BASE_URL}</link>`;
    rss += `<description>Live News Feed</description>`;

    posts.forEach(p => {
      rss += `
        <item>
          <title>${p.title}</title>
          <link>${BASE_URL}/news/${p.slug}</link>
          <description>${(p.content || "").substring(0, 150)}</description>
        </item>`;
    });

    rss += `</channel></rss>`;

    res.set("Content-Type", "application/xml");
    res.send(rss);
  } catch (err) {
    res.status(500).send("RSS error");
  }
});

/* =========================
   SITEMAP (GOOGLE NEWS SEO)
========================= */
app.get("/sitemap.xml", async (req, res) => {
  try {
    const posts = await Post.find().lean();

    let sitemap = `<?xml version="1.0"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    posts.forEach(p => {
      sitemap += `
        <url>
          <loc>${BASE_URL}/news/${p.slug}</loc>
        </url>`;
    });

    sitemap += `</urlset>`;

    res.set("Content-Type", "application/xml");
    res.send(sitemap);
  } catch (err) {
    res.status(500).send("Sitemap error");
  }
});

/* =========================
   AUTO SLUG BEFORE SAVE
========================= */
Post.schema.pre("save", function (next) {
  if (!this.slug) {
    this.slug = createSlug(this.title);
  }
  next();
});

/* =========================
   START SERVER
========================= */
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Connected");

    await migrateSlugs();

    server.listen(PORT, "0.0.0.0", () => {
      console.log("NEWSROOM CMS RUNNING ON", PORT);
    });
  } catch (err) {
    console.log("DB ERROR:", err.message);
  }
}

start();
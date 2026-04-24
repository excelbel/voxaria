require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");
const slugify = require("slugify");

const Post = require("./models/post");

const app = express();

/* ENV */
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

/* DATABASE */
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log("MongoDB Connected");

    const fetchNewsAndSave = require("./services/newsService");

    await fetchNewsAndSave();
    setInterval(fetchNewsAndSave, 30 * 60 * 1000);
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

/* MIDDLEWARE */
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

/* GLOBALS */
app.use((req, res, next) => {
  res.locals.isAdmin = req.session.isAdmin || false;
  res.locals.role = req.session.role || null;
  next();
});

/* SIDEBAR */
async function getSidebarData() {
  const randomPostArr = await Post.aggregate([{ $sample: { size: 1 } }]);

  return {
    randomPost: randomPostArr[0] || null,
    recentPosts: await Post.find().sort({ date: -1 }).limit(5),
    trendingPosts: await Post.find().sort({ views: -1 }).limit(5)
  };
}

/* HOME */
app.get("/", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const skip = (page - 1) * limit;

  const posts = await Post.find()
    .sort({ isBreaking: -1, date: -1 })
    .skip(skip)
    .limit(limit);

  const totalPosts = await Post.countDocuments();
  const totalPages = Math.ceil(totalPosts / limit);

  const sidebar = await getSidebarData();
  const featuredPost = await Post.findOne().sort({ views: -1 });
  const featuredGrid = await Post.find().sort({ views: -1 }).limit(4);
  const breakingNews = await Post.find({ isBreaking: true }).limit(10);

  res.render("index", {
    posts,
    page,
    totalPages,
    featuredPost,
    featuredGrid,
    breakingNews,
    currentPage: "Home",
    ...sidebar
  });
});

/* CATEGORY */
app.get("/category/:name", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const skip = (page - 1) * limit;

  const posts = await Post.find({ category: req.params.name })
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit);

  const totalPosts = await Post.countDocuments({ category: req.params.name });
  const totalPages = Math.ceil(totalPosts / limit);

  const sidebar = await getSidebarData();

  res.render("category", {
    posts,
    category: req.params.name,
    page,
    totalPages,
    currentPage: req.params.name,
    ...sidebar
  });
});

/* SEARCH */
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.redirect("/");

  const posts = await Post.find({
    title: { $regex: query, $options: "i" }
  });

  const sidebar = await getSidebarData();

  res.render("search", {
    posts,
    query,
    currentPage: "Search",
    ...sidebar
  });
});

/* SINGLE POST */
app.get("/post/:slug", async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug });

  if (!post) return res.status(404).send("Post not found");

  post.views = (post.views || 0) + 1;
  await post.save();

  const relatedPosts = await Post.find({
    category: post.category,
    _id: { $ne: post._id }
  }).limit(3);

  res.render("post", {
    post,
    relatedPosts,
    currentPage: post.category
  });
});

/* LIKE */
app.post("/like/:id", async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).send("Not found");

  post.likes = (post.likes || 0) + 1;
  await post.save();

  res.redirect("back");
});

/* COMMENT */
app.post("/post/:id/comment", async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.redirect("/");

  post.comments.push({
    name: req.body.name,
    text: req.body.text
  });

  await post.save();
  res.redirect("back");
});

/* ADMIN LOGIN */
app.get("/admin", (req, res) => {
  if (!req.session.isAdmin) return res.render("login");

  Post.find().sort({ date: -1 }).then(posts => {
    res.render("admin", { posts });
  });
});

/* LOGIN */
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    req.session.isAdmin = true;
    return res.redirect("/admin");
  }

  res.send("Invalid login details");
});

/* LOGOUT */
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

/* CREATE POST */
app.post("/admin/create", async (req, res) => {
  await Post.create({
    title: req.body.title,
    slug: slugify(req.body.title, { lower: true, strict: true }),
    content: req.body.content,
    author: req.body.author,
    category: req.body.category,
    isBreaking: req.body.isBreaking === "on",
    thumbnail: req.body.thumbnail || "/images/default-thumb.jpg",
    mainImage: req.body.mainImage || "/images/default-main.jpg"
  });

  res.redirect("/admin");
});

/* EDIT */
app.get("/admin/edit/:id", async (req, res) => {
  if (!req.session.isAdmin) return res.redirect("/admin");

  const post = await Post.findById(req.params.id);
  if (!post) return res.send("Post not found");

  res.render("edit", { post });
});

app.post("/admin/edit/:id", async (req, res) => {
  if (!req.session.isAdmin) return res.redirect("/admin");

  await Post.findByIdAndUpdate(req.params.id, {
    title: req.body.title,
    slug: slugify(req.body.title, { lower: true, strict: true }),
    content: req.body.content,
    author: req.body.author,
    category: req.body.category,
    thumbnail: req.body.thumbnail,
    mainImage: req.body.mainImage,
    isBreaking: req.body.isBreaking === "on"
  });

  res.redirect("/admin");
});

/* DELETE */
app.get("/admin/delete/:id", async (req, res) => {
  if (!req.session.isAdmin) return res.redirect("/admin");

  await Post.findByIdAndDelete(req.params.id);
  res.redirect("/admin");
});

/* AI SUMMARY (simple fallback) */
app.post("/admin/generate-summary/:id", async (req, res) => {
  if (!req.session.isAdmin) return res.redirect("/admin");

  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).send("Post not found");

  post.aiSummary = post.content.substring(0, 180) + "...";
  await post.save();

  res.redirect("/admin/edit/" + req.params.id);
});

/* SHARE TRACKING */
app.post("/share/:id/:platform", async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).send("Not found");

  const platform = req.params.platform;

  post.shares = post.shares || { whatsapp: 0, facebook: 0, total: 0 };

  if (post.shares[platform] !== undefined) {
    post.shares[platform] += 1;
    post.shares.total += 1;
  }

  await post.save();
  res.json({ success: true });
});

/* POSTS API */
app.get("/posts", async (req, res) => {
  const posts = await Post.find().sort({ date: -1 });
  res.json(posts);
});

/* ADMIN ANALYTICS */
app.get("/admin/analytics", async (req, res) => {
  if (!req.session.isAdmin) return res.redirect("/admin");

  const totalPosts = await Post.countDocuments();

  const totalViewsAgg = await Post.aggregate([
    { $group: { _id: null, views: { $sum: "$views" } } }
  ]);

  const totalSharesAgg = await Post.aggregate([
    { $group: { _id: null, total: { $sum: "$shares.total" } } }
  ]);

  const topPosts = await Post.find().sort({ views: -1 }).limit(5);

  res.render("analytics", {
    totalPosts,
    totalViews: totalViewsAgg[0]?.views || 0,
    totalShares: totalSharesAgg[0]?.total || 0,
    topPosts
  });
});

/* SERVER */
app.listen(3000, () => {
  console.log(`Blog running on port ${PORT}`);
});
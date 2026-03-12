const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

const Post = require("./models/post");

const app = express();

/* ENVIRONMENT VARIABLES */
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/voxaria project";

/* DATABASE CONNECTION */
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB connection error:", err));

/* MIDDLEWARE */
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: process.env.SESSION_SECRET || "premiumblogsecret",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 week
}));

app.set("view engine", "ejs");

/* GLOBAL VARIABLES */
app.use((req, res, next) => {
  res.locals.isAdmin = req.session.isAdmin || false;
  res.locals.adminUser = req.session.adminUser || null;
  res.locals.role = req.session.role || null;
  next();
});

/* LOAD SIDEBAR DATA */
async function getSidebarData() {
  const randomPostArr = await Post.aggregate([{ $sample: { size: 1 } }]);
  return {
    randomPost: randomPostArr.length ? randomPostArr[0] : null,
    recentPosts: await Post.find().sort({ date: -1 }).limit(5),
    trendingPosts: await Post.find().sort({ views: -1 }).limit(5),
    previousPosts: await Post.find().sort({ date: 1 }).limit(5)
  };
}

/* LOAD ADMIN DATA */
let admins = [];
try {
  admins = JSON.parse(fs.readFileSync(path.join(__dirname, "admins.json"), "utf8"));
} catch (err) {
  console.log("admins.json not found or invalid. Admin login will not work until added.");
}

/* ROUTES */

/* HOME */
app.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    const posts = await Post.find().sort({ date: -1 }).skip(skip).limit(limit);
    const totalPosts = await Post.countDocuments();
    const totalPages = Math.ceil(totalPosts / limit);
    const featuredPost = await Post.findOne().sort({ views: -1 });
    const featuredGrid = await Post.find().sort({ views: -1 }).limit(4);
    const sidebar = await getSidebarData();
    const breakingNews = await Post.find({ isBreaking: true }).sort({ date: -1 }).limit(10);

    res.render("index", { posts, page, totalPages, featuredPost, featuredGrid, breakingNews, currentPage: "Home", ...sidebar });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
});

/* CATEGORY */
app.get("/category/:name", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ category: req.params.name }).sort({ date: -1 }).skip(skip).limit(limit);
    const totalPosts = await Post.countDocuments({ category: req.params.name });
    const totalPages = Math.ceil(totalPosts / limit);
    const sidebar = await getSidebarData();

    res.render("category", { posts, category: req.params.name, page, totalPages, currentPage: req.params.name, ...sidebar });
  } catch (err) {
    console.log(err);
    res.status(500).send("Category Error");
  }
});

/* SEARCH */
app.get("/search", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.redirect("/");

    const posts = await Post.find({ title: { $regex: query, $options: "i" } }).sort({ date: -1 });
    const sidebar = await getSidebarData();

    res.render("search", { posts, query, currentPage: "Search", ...sidebar });
  } catch (err) {
    res.status(500).send("Search Error");
  }
});

/* SINGLE POST */
app.get("/post/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send("Post not found");

    post.views = (post.views || 0) + 1;
    await post.save();

    const relatedPosts = await Post.find({ category: post.category, _id: { $ne: post._id } }).limit(3);

    res.render("post", { post, relatedPosts, currentPage: post.category });
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

/* LIKE POST */
app.post("/like/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send("Post not found");

    post.likes = (post.likes || 0) + 1;
    await post.save();

    res.redirect("/post/" + req.params.id);
  } catch (err) {
    res.status(500).send("Error liking post");
  }
});

/* COMMENT */
app.post("/post/:id/comment", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.redirect("/");

    post.comments.push({ name: req.body.name, text: req.body.text });
    await post.save();
    res.redirect("/post/" + req.params.id);
  } catch {
    res.send("Error adding comment");
  }
});

/* ADMIN AUTH */
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const admin = admins.find(a => a.username === username && a.password === password);
  if (admin) {
    req.session.isAdmin = true;
    req.session.adminUser = username;
    req.session.role = admin.role;
    return res.redirect("/admin");
  }

  res.send("Wrong username or password");
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

/* ADMIN DASHBOARD */
app.get("/admin", async (req, res) => {
  if (!req.session.isAdmin) return res.render("login");

  const posts = await Post.find().sort({ date: -1 });
  res.render("admin", { posts });
});

/* CREATE POST */
app.post("/admin/create", async (req, res) => {
  await Post.create({
    title: req.body.title,
    content: req.body.content,
    author: req.body.author,
    category: req.body.category,
    isBreaking: req.body.isBreaking === "on",
    thumbnail: req.body.thumbnail || "/images/default-thumb.jpg",
    mainImage: req.body.mainImage || "/images/default-main.jpg"
  });
  res.redirect("/admin");
});

/* DELETE POST */
app.get("/admin/delete/:id", async (req, res) => {
  if (req.session.role !== "admin") return res.send("Permission denied");

  await Post.findByIdAndDelete(req.params.id);
  res.redirect("/admin");
});

/* EDIT POST */
app.get("/admin/edit/:id", async (req, res) => {
  if (req.session.role !== "admin") return res.send("Permission denied");

  const post = await Post.findById(req.params.id);
  res.render("edit", { post });
});

/* UPDATE POST */
app.post("/admin/update/:id", async (req, res) => {
  if (req.session.role !== "admin") return res.send("Permission denied");

  await Post.findByIdAndUpdate(req.params.id, {
    title: req.body.title,
    content: req.body.content,
    author: req.body.author,
    category: req.body.category,
    isBreaking: req.body.isBreaking === "on",
    thumbnail: req.body.thumbnail || "/images/default-thumb.jpg",
    mainImage: req.body.mainImage || "/images/default-main.jpg"
  });

  res.redirect("/admin");
});

/* SERVER */
app.listen(PORT, () => {
  console.log(`Blog running on port ${PORT}`);
});
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
   BASIC MIDDLEWARE
========================= */
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   SESSION (SAFE FALLBACK)
========================= */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "voxaria_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  })
);

/* =========================
   GLOBAL LOCALS (FIX EJS ERROR)
========================= */
app.use((req, res, next) => {
  res.locals.baseUrl = BASE_URL;
  res.locals.featuredGrid = []; // prevents crash
  next();
});

/* =========================
   HEALTH CHECK (IMPORTANT FOR RENDER)
========================= */
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* =========================
   HOME ROUTE
========================= */
app.get("/", async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ date: -1 })
      .limit(10);

    res.render("index", {
      posts,
      currentPage: "home",
      featuredGrid: posts.slice(1, 5)
    });
  } catch (err) {
    console.log("HOME ERROR:", err.message);
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

    res.render("post", {
      post,
      relatedPosts: []
    });
  } catch (err) {
    console.log("POST ERROR:", err.message);
    res.status(500).send("Server Error");
  }
});

/* =========================
   START SERVER
========================= */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB Connected");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("DB ERROR:", err.message);
    process.exit(1);
  });
const express = require("express");
const session = require("express-session");
const compression = require("compression");
const path = require("path");

const app = express();

/* =========================
   CORE MIDDLEWARE
========================= */
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   VIEW ENGINE
========================= */
app.set("view engine", "ejs");
app.set("trust proxy", 1);

/* =========================
   STATIC FILES
========================= */
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   SESSION CONFIG
========================= */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "voxaria_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production"
    }
  })
);

/* =========================
   GLOBAL LOCALS (SAFE DEFAULTS)
========================= */
app.use((req, res, next) => {
  res.locals.baseUrl =
    process.env.BASE_URL ||
    `${req.protocol}://${req.get("host")}`;

  res.locals.currentPage = "";

  // safe defaults (avoid undefined errors in EJS)
  res.locals.featuredGrid = [];
  res.locals.breakingNews = [];
  res.locals.posts = [];

  next();
});

/* =========================
   ROUTES
========================= */
app.use("/", require("./routes"));

/* =========================
   HEALTH CHECK (OPTIONAL BUT USEFUL)
========================= */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is running"
  });
});

/* =========================
   404 HANDLER
========================= */
app.use((req, res) => {
  res.status(404).render("404", {
    currentPage: "404"
  });
});

/* =========================
   GLOBAL ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error("APP ERROR:", err);

  res.status(500).render("error", {
    message: "Server Error",
    currentPage: "error"
  });
});

module.exports = app;
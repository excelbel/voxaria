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
   SESSION CONFIG (PRODUCTION SAFE)
========================= */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "voxaria",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production"
    }
  })
);

/* =========================
   GLOBAL LOCALS (SAFE)
========================= */
app.use((req, res, next) => {
  res.locals.baseUrl = process.env.BASE_URL || "http://localhost:3000";

  // only defaults, NOT fake data
  res.locals.featuredGrid = null;
  res.locals.breakingNews = null;

  next();
});

/* =========================
   ROUTES
========================= */
app.use("/", require("./routes"));

/* =========================
   404 HANDLER
========================= */
app.use((req, res) => {
  res.status(404).send("Page not found");
});

/* =========================
   GLOBAL ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.log("APP ERROR:", err.message);
  res.status(500).send("Server Error");
});

module.exports = app;
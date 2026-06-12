const express = require("express");
const session = require("express-session");
const compression = require("compression");
const path = require("path");
const MongoStore = require("connect-mongo");

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
   SESSION (FIXED FOR RENDER)
========================= */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "voxaria",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 60 * 60 * 24
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production"
    }
  })
);

/* =========================
   GLOBAL LOCALS
========================= */
app.use((req, res, next) => {
  res.locals.baseUrl =
    process.env.BASE_URL ||
    `${req.protocol}://${req.get("host")}`;

  res.locals.featuredGrid = [];
  res.locals.breakingNews = [];
  res.locals.currentPage = "";

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
   ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error("APP ERROR:", err.message);
  res.status(500).send("Server Error");
});

module.exports = app;
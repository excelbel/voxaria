const express = require("express");
const session = require("express-session");
const compression = require("compression");
const path = require("path");

const app = express();

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: process.env.SESSION_SECRET || "voxaria",
  resave: false,
  saveUninitialized: false
}));

// GLOBAL FIX
app.use((req, res, next) => {
  res.locals.baseUrl = "https://voxaria.org";
  res.locals.featuredGrid = [];
  res.locals.breakingNews = [];
  next();
});

app.use("/", require("./routes/index"));

module.exports = app;
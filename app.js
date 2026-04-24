const express = require("express");
const compression = require("compression");
const path = require("path");
const session = require("express-session");

const app = express();

app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "voxaria",
    resave: false,
    saveUninitialized: false
  })
);

// routes
app.use("/", require("./routes/index"));

module.exports = app;
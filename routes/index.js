const express = require("express");
const router = express.Router();

const homeController = require("../src/controllers/homeController");

/* Home Page */
router.get("/", homeController.home);

/* Single News Post */
router.get("/news/:slug", homeController.singlePost);

module.exports = router;

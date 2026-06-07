const express = require("express");
const router = express.Router();

const homeController = require("../src/controllers/homeController");

/* HOME */
router.get("/", homeController.home);

/* SINGLE POST */
router.get("/news/:slug", homeController.singlePost);

module.exports = router;
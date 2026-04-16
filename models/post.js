const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  text: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  date: { type: Date, default: Date.now },
  author: { type: String, default: "Admin" },
  category: { type: String, default: "General" },
  likes: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  comments: [commentSchema],
  isBreaking: { type: Boolean, default: false },
  thumbnail: { type: String, default: "/images/default-thumb.jpg" },
  mainImage: { type: String, default: "/images/default-main.jpg" }
});

module.exports = mongoose.model("Post", postSchema);

const fetchNewsAndSave = require("./services/newsService");

// run once on startup
fetchNewsAndSave();

// or run every 30 minutes
setInterval(fetchNewsAndSave, 30 * 60 * 1000);

const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    title: String,
    slug: { type: String, unique: true },
    content: String,
    aiSummary: String,
    category: String,
    seoDescription: String,
    mainImage: String,
    imagePrompt: String,
    breakingScore: Number,
    views: { type: Number, default: 0 },
    author: { type: String, default: "Admin" },
    aiProcessed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);
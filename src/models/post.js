const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true, index: true },

  content: { type: String, default: "" },

  category: {
    type: String,
    enum: [
      "News",
      "Article",
      "Entertainment",
      "International",
      "Journals",
      "Politics",
      "Security",
      "Sports"
    ],
    default: "News"
  },

  thumbnail: String,
  mainImage: String,

  author: { type: String, default: "Admin" },

  views: { type: Number, default: 0 },

  isBreaking: { type: Boolean, default: false },

  /* =========================
     PUBLISH STATUS
     false = draft (admin only)
     true  = live on public site
  ========================= */
  published: { type: Boolean, default: false },

  /* =========================
     AI GENERATED CONTENT
  ========================= */
  aiSummary:      { type: String, default: "" },
  seoDescription: { type: String, default: "" },
  imagePrompt:    { type: String, default: "" },

  /* =========================
     ENGAGEMENT
  ========================= */
  likes: { type: Number, default: 0 },

  analytics: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 }
  },

  /* =========================
     SOURCE INFO
  ========================= */
  source:    { type: String, default: "admin" },
  sourceUrl: { type: String, unique: true, sparse: true },

  /* =========================
     AI / SYSTEM FLAGS
  ========================= */
  aiProcessed: { type: Boolean, default: false },

  /* =========================
     TIMESTAMPS
  ========================= */
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Post", postSchema);

const mongoose = require("mongoose");
const slugify = require("slugify");

const commentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  text: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const analyticsSchema = new mongoose.Schema({
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  engagement: { type: Number, default: 0 }
});

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true, index: true },
  content: { type: String, required: true },

  aiSummary: { type: String, default: "" },
  readTime: { type: Number, default: 0 },

  seoTitle: { type: String, default: "" },
  tags: [String],

  date: { type: Date, default: Date.now },
  author: { type: String, default: "Admin" },
  category: { type: String, default: "General" },

  isBreaking: { type: Boolean, default: false },

  thumbnail: { type: String, default: "/images/default-thumb.jpg" },
  mainImage: { type: String, default: "/images/default-main.jpg" },

  analytics: analyticsSchema,
  comments: [commentSchema],

  subscribers: [{ type: String }]
});

/* SAFE SLUG GENERATION (NO next used incorrectly) */
postSchema.pre("save", async function () {
  if (!this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
});

module.exports = mongoose.model("Post", postSchema);
const mongoose = require("mongoose");
const slugify = require("slugify");

const commentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  text: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },

  // SEO URL
  slug: { type: String, unique: true, index: true },

  content: { type: String, required: true },

  // AI Summary (NEW)
  aiSummary: { type: String, default: "" },

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

// AUTO SLUG GENERATION
postSchema.pre("save", function (next) {
  if (!this.slug || this.isModified("title")) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true
    });
  }
  next();
});

module.exports = mongoose.model("Post", postSchema);
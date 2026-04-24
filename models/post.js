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
  engagement: { type: Number, default: 0 } // optional metric
});

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },

  // SEO FRIENDLY URL
  slug: { type: String, unique: true, index: true },

  content: { type: String, required: true },

  // AI GENERATED SUMMARY
  aiSummary: { type: String, default: "" },

  // CONTENT METADATA
  date: { type: Date, default: Date.now },
  author: { type: String, default: "Admin" },
  category: { type: String, default: "General" },
  isBreaking: { type: Boolean, default: false },

  // MEDIA
  thumbnail: { type: String, default: "/images/default-thumb.jpg" },
  mainImage: { type: String, default: "/images/default-main.jpg" },

  // ANALYTICS (NEW STRUCTURE)
  analytics: analyticsSchema,

  // COMMENTS
  comments: [commentSchema]
});

/**
 * AUTO SLUG GENERATION
 * Ensures clean SEO URLs like:
 * /post/tinubu-visits-uk-security-tightened
 */
postSchema.pre("save", function (next) {
  if (!this.slug || this.isModified("title")) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true
    });
  }

  
});

module.exports = mongoose.model("Post", postSchema);
cat > /mnt/user-data/outputs/post.js << 'EOF'
const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug:  { type: String, unique: true, index: true },
  content: { type: String, default: "" },

  category: {
    type: String,
    enum: [
      "News", "Article", "Politics", "Security", "International",
      "Sports", "Football", "Basketball", "Athletics",
      "Entertainment", "Lifestyle", "Music", "Movies",
      "Technology", "Science", "AI",
      "Finance", "Economy", "Markets",
      "Health", "Journals", "Wellness"
    ],
    default: "News"
  },

  thumbnail:  String,
  mainImage:  String,
  author:     { type: String, default: "Admin" },
  views:      { type: Number, default: 0 },
  isBreaking: { type: Boolean, default: false },
  published:  { type: Boolean, default: false },

  aiSummary:      { type: String, default: "" },
  seoDescription: { type: String, default: "" },
  imagePrompt:    { type: String, default: "" },

  likes:    { type: Number, default: 0 },
  analytics: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 }
  },

  source:      { type: String, default: "admin" },
  sourceUrl:   { type: String, unique: true, sparse: true },
  aiProcessed: { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model("Post", postSchema);


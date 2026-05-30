const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },

    slug: {
      type: String,
      unique: true,
      required: true
    },

    content: {
      type: String,
      default: ""
    },

    aiSummary: {
      type: String,
      default: ""
    },

    category: {
      type: String,
      default: "News"
    },

    seoDescription: {
      type: String,
      default: ""
    },

    mainImage: {
      type: String,
      default: "/images/default-main.jpg"
    },

    imagePrompt: {
      type: String,
      default: ""
    },

    breakingScore: {
      type: Number,
      default: 0
    },

    views: {
      type: Number,
      default: 0
    },

    author: {
      type: String,
      default: "Admin"
    },

    aiProcessed: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Post", postSchema);
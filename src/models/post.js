const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    content: {
      type: String,
      required: true
    },

    summary: {
      type: String,
      default: ""
    },

    slug: {
      type: String,
      unique: true,
      index: true
    },

    category: {
      type: String,
      default: "General"
    },

    image: {
      type: String,
      default: ""
    },

    isBreaking: {
      type: Boolean,
      default: false
    },

    source: {
      type: String,
      default: "INTERNAL"
    },

    analytics: {
      views: {
        type: Number,
        default: 0
      },
      likes: {
        type: Number,
        default: 0
      },
      shares: {
        type: Number,
        default: 0
      }
    },

    author: {
      type: String,
      default: "Admin"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Post", PostSchema);
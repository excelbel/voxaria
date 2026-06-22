const mongoose = require("mongoose");

const deletedPostSchema = new mongoose.Schema({
  slug: { type: String, index: true },
  sourceUrl: { type: String, index: true },

  // optional: block entire domains later
  domain: { type: String, index: true },

  reason: { type: String, default: "manual delete" },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("DeletedPost", deletedPostSchema);
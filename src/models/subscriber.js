const mongoose = require("mongoose");

const subscriberSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    device: {
      type: String,
      default: "unknown"
    },

    active: {
      type: Boolean,
      default: true
    },

    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Subscriber", subscriberSchema);
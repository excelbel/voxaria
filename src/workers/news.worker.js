require("dotenv").config();

const mongoose = require("mongoose");
const Post = require("../../models/post");
const { generateNewsPackage } = require("../modules/ai/ai.service")

/* =========================
   DB CONNECTION
========================= */
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🧠 Worker connected to DB");
  } catch (err) {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  }
}

/* =========================
   AI PROCESS ONLY
   (NO FETCHING, NO INTERVALS)
========================= */
async function processNews(posts = []) {
  try {
    console.log("📡 Running AI processing cycle...");

    if (!Array.isArray(posts) || posts.length === 0) {
      console.log("No posts provided for processing");
      return;
    }

    console.log("Processing posts:", posts.length);

    for (const post of posts) {
      try {
        const ai = await generateNewsPackage(post.content || post.title);

        await Post.updateOne(
          { slug: post.slug },
          {
            title: ai?.title || post.title,
            content: ai?.article || post.content,
            aiSummary: ai?.summary || "",
            category: ai?.category || "News",
            seoDescription: ai?.seoDescription || "",
            mainImage: post.mainImage,
            imagePrompt: ai?.imagePrompt || "",
            breakingScore: ai?.breakingScore || 0,
            aiProcessed: true,
            updatedAt: new Date()
          }
        );

        console.log("✔ Updated:", post.title);

      } catch (err) {
        console.log("AI error:", err.message);
      }
    }

    console.log("✅ AI processing complete");

  } catch (err) {
    console.log("Process error:", err.message);
  }
}

/* =========================
   RUN WORKER ONCE ONLY
========================= */
async function runWorker() {
  await connectDB();

  console.log("Worker ready (waiting for data input)");
}

runWorker();

/* =========================
   EXPORT ONLY
========================= */
module.exports = {
  processNews
};
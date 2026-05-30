require("dotenv").config();

const mongoose = require("mongoose");
const Post = require("../models/post");

const { fetchNewsAndSave } = require("../modules/news/news.fetcher");
const { generateNewsPackage } = require('../modules/ai/ai.services');

/* =========================
   WORKER CORE
========================= */
async function runWorker() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🧠 Worker connected to DB");

    await processNews();

    setInterval(processNews, 20 * 60 * 1000);
  } catch (err) {
    console.log("Worker failed to start:", err.message);
  }
}

/* =========================
   NEWS PROCESSING PIPELINE
========================= */
async function processNews() {
  try {
    console.log("📡 Fetching news batch...");

    const news = await fetchNewsAndSave();

    if (!Array.isArray(news) || news.length === 0) {
      console.log("No news found in fetcher");
      return;
    }

    for (const item of news) {
      try {
        if (!item?.title) continue;

        /* =========================
           AI NEWS ENGINE
        ========================= */
        const ai = await generateNewsPackage(
          item.content || item.description || item.title
        );

        /* =========================
           DATABASE SAVE
        ========================= */
        await Post.updateOne(
          { slug: item.slug },
          {
            title: ai.title || item.title,
            slug: item.slug,
            content: ai.article,
            aiSummary: ai.summary,
            category: ai.category,
            seoDescription: ai.seoDescription,
            mainImage: item.urlToImage || "/images/default-main.jpg",
            imagePrompt: ai.imagePrompt,
            breakingScore: ai.breakingScore,
            aiProcessed: true,
            updatedAt: new Date()
          },
          { upsert: true }
        );

      } catch (err) {
        console.log("❌ AI processing error:", err.message);
      }
    }

    console.log("✅ Batch processed successfully");

  } catch (err) {
    console.log("❌ Process error:", err.message);
  }
}

/* =========================
   START WORKER
========================= */
runWorker();
require("dotenv").config();

const mongoose = require("mongoose");
const Post = require("../models/post");

const { fetchNewsAndSave } = require("../modules/news/news.fetcher");
const { generateNewsPackage } = require('../modules/ai/ai.service');

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

   async function fetchNewsAndSave() {
  console.log("News fetcher started");

  try {
    const response = await axios.get(
      "https://newsapi.org/v2/top-headlines",
      {
        params: {
          country: "us",
          apiKey: process.env.NEWS_API_KEY
        },
        timeout: 10000
      }
    );

    const articles = response?.data?.articles || [];

    console.log("Articles received:", articles.length);

    for (const article of articles) {
      try {
        if (!article?.title) continue;

        const exists = await Post.findOne({
          title: article.title
        });

        if (exists) continue;

        await Post.create({
          title: article.title,
          content: article.description || "No content available",
          category: "News",
          mainImage: article.urlToImage || "",
          source: "API"
        });

      } catch (err) {
        console.log("Article error:", err.message);
      }
    }

    return articles;

  } catch (err) {
    console.log("News fetch error:", err.message);
    return [];
  }
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
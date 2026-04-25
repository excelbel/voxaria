require("dotenv").config();

const mongoose = require("mongoose");
const Post = require("../models/post");

const { fetchNewsAndSave } = require("../modules/news/news.fetcher");
const { generateNewsPackage } = require("../services/aiService");
const { generateImage } = require("../modules/media/image.service");

/* =========================
   CONNECT DB
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
   PROCESS NEWS PIPELINE
========================= */
async function processNews() {
  try {
    console.log("📡 Fetching news batch...");

    const news = await fetchNewsAndSave();

    if (!Array.isArray(news) || news.length === 0) {
      console.log("No news returned from fetcher");
      return;
    }

    for (const item of news) {
      try {
        if (!item?.title) continue;

        const rawContent =
          item.content || item.description || item.title || "";

        /* =========================
           AI GENERATION (OPENAI CORE)
        ========================= */
        const ai = await generateNewsPackage(rawContent);

        /* =========================
           IMAGE GENERATION
        ========================= */
        const image = await generateImage(item.title);

        /* =========================
           SAVE / UPDATE POST
        ========================= */
        await Post.updateOne(
          { slug: item.slug },
          {
            title: ai?.title || item.title,
            slug: item.slug,
            content: ai?.article || rawContent,
            aiSummary: ai?.summary || "",
            category: ai?.category || "News",
            seoDescription: ai?.seoDescription || "",
            mainImage: image || item.urlToImage || "/images/default-main.jpg",
            imagePrompt: ai?.imagePrompt || "",
            breakingScore: ai?.breakingScore || 0,
            aiProcessed: true,
            updatedAt: new Date()
          },
          { upsert: true }
        );

        console.log(`✔ Processed: ${item.title}`);

      } catch (err) {
        console.error("❌ Item processing failed:", err.message);
      }
    }

    console.log("✅ Batch completed");

  } catch (err) {
    console.error("❌ Process error:", err.message);
  }
}

/* =========================
   WORKER START
========================= */
async function runWorker() {
  await connectDB();

  await processNews();

  setInterval(processNews, 20 * 60 * 1000);
}

runWorker();
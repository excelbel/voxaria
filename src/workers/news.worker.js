require("dotenv").config();

const mongoose = require("mongoose");
const Post = require("../models/post");

const { fetchNewsAndSave } = require("../modules/news/news.fetcher");
const { generateSummary } = require("../modules/ai/ai.service");
const { generateImage } = require("../modules/media/image.service");

/* =========================
   WORKER CORE
========================= */
async function runWorker() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Worker connected to DB");

    await processNews();

    setInterval(processNews, 20 * 60 * 1000);

  } catch (err) {
    console.log("Worker failed to start:", err.message);
  }
}

/* =========================
   PROCESS NEWS PIPELINE
========================= */
async function processNews() {
  try {
    console.log("Fetching news batch...");

    const news = await fetchNewsAndSave();

    if (!Array.isArray(news)) {
      console.log("No news returned from fetcher");
      return;
    }

    for (const item of news) {
      try {
        if (!item?.title) continue;

        const aiArticle = await generateSummary(item.content || "", {
          mode: "bbc"
        });

        const image = await generateImage(item.title);

        await Post.updateOne(
          { slug: item.slug },
          {
            title: item.title,
            content: aiArticle,
            mainImage: image,
            aiProcessed: true,
            updatedAt: new Date()
          },
          { upsert: true }
        );

      } catch (err) {
        console.log("AI processing error:", err.message);
      }
    }

    console.log("Batch processed successfully");

  } catch (err) {
    console.log("Process error:", err.message);
  }
}

/* =========================
   START WORKER
========================= */
runWorker();
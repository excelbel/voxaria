require("dotenv").config();

const mongoose = require("mongoose");
const Post = require("../models/post");

const { fetchNewsAndSave } = require("../modules/news/news.fetcher");
const { generateNewsPackage } = require("../modules/ai/ai.service");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🧠 Worker connected to DB");
  } catch (err) {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  }
}

async function processNews() {
  try {
    console.log("📡 Fetching news batch...");

    const news = await fetchNewsAndSave();

    if (!Array.isArray(news) || news.length === 0) {
      console.log("No news found");
      return;
    }

    for (const slug of news) {
      try {
        const post = await Post.findOne({ slug }).lean();
        if (!post) continue;

        const ai = await generateNewsPackage(post.content || post.title);

        await Post.updateOne(
          { slug },
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

        console.log("✔ Processed:", post.title);
      } catch (err) {
        console.log("❌ AI processing error:", err.message);
      }
    }

    console.log("✅ Batch completed");
  } catch (err) {
    console.log("❌ Process error:", err.message);
  }
}

async function runWorker() {
  await connectDB();
  await processNews();

  setInterval(processNews, 20 * 60 * 1000);
}

runWorker();
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
    console.log("📡 Running news cycle...");

    const slugs = await fetchNewsAndSave();

    if (!slugs.length) {
      console.log("No slugs returned");
      return;
    }

    console.log("Processing slugs:", slugs.length);

    for (const slug of slugs) {
      try {
        const post = await Post.findOne({ slug });

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

        console.log("✔ Updated:", post.title);

      } catch (err) {
        console.log("AI error:", err.message);
      }
    }

    console.log("✅ Cycle complete");

  } catch (err) {
    console.log("Process error:", err.message);
  }
}

async function runWorker() {
  await connectDB();

  await processNews();

  // safer interval (avoids overlap issues)
  setInterval(() => {
    processNews().catch(err =>
      console.log("Worker crash:", err.message)
    );
  }, 10 * 60 * 1000); // every 10 mins
}

runWorker();
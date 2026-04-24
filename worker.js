require("dotenv").config();

const mongoose = require("mongoose");
const Post = require("./models/post");

const fetchNewsAndSave = require("./services/newsService");
const { generateSummary } = require("./services/aiService");
const generateImage = require("./services/imageService");

/* =========================
   ENTERPRISE WORKER
========================= */
async function runWorker() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("🧠 Worker Online");

  async function processNews() {
    console.log("Fetching news batch...");

    const news = await fetchNewsAndSave();

    for (let item of news || []) {
      try {
        const aiArticle = await generateSummary(item.content, {
          mode: "bbc"
        });

        const image = await generateImage(item.title);

        await Post.updateOne(
          { slug: item.slug },
          {
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

    console.log("Batch processed");
  }

  // initial run
  await processNews();

  // interval
  setInterval(processNews, 20 * 60 * 1000);
}

runWorker();
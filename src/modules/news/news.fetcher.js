const axios = require("axios");
const Post = require("../../models/post");
const { generateNewsPackage } = require("../ai/ai.service");
const { detectCategory } = require("../utils/categoryEngine");

async function fetchNewsAndSave() {
  console.log("News engine running...");

  try {
    const url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=20&apiKey=${process.env.NEWS_API_KEY}`;

    const res = await axios.get(url);
    const articles = res.data.articles || [];

    for (const article of articles) {
      try {
        if (!article.title) continue;

        const slug = article.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        const exists = await Post.findOne({ slug });
        if (exists) continue;

        const rawText = `${article.title} ${article.description || ""}`;

        // FORCE CATEGORY FIRST (IMPORTANT FIX)
        let category = detectCategory(rawText);

        // AI enrichment (optional, not controlling category anymore)
        let ai = null;
        try {
          ai = await generateNewsPackage(rawText);
        } catch (e) {
          ai = null;
        }

        await Post.create({
          title: ai?.title || article.title,
          slug,
          content: ai?.article || article.description || "No content",
          category, // IMPORTANT FIX HERE
          thumbnail: article.urlToImage || "/images/default-thumb.jpg",
          mainImage: article.urlToImage || "/images/default-main.jpg",
          views: 0,
          isBreaking: false,
          createdAt: new Date()
        });

      } catch (err) {
        console.log("Article error:", err.message);
      }
    }

    console.log("News engine completed");

  } catch (err) {
    console.log("Fetcher error:", err.message);
  }
}

module.exports = { fetchNewsAndSave };
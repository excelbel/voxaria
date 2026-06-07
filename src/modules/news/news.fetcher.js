const axios = require("axios");
const Post = require("../../models/post");

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

    const results = [];

    for (const article of articles) {
      try {
        if (!article?.title) continue;

        const slug = article.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        const updated = await Post.updateOne(
          { slug },
          {
            title: article.title,
            slug,
            content: article.description || "No content available",
            category: "News",
            mainImage: article.urlToImage || "/images/default-main.jpg",
            source: "API",
            views: 0,
            aiProcessed: false,
            updatedAt: new Date()
          },
          { upsert: true }
        );

        results.push(slug);
      } catch (err) {
        console.log("Article error:", err.message);
      }
    }

    return results;
  } catch (err) {
    console.log("News fetch error:", err.message);
    return [];
  }
}

module.exports = { fetchNewsAndSave };
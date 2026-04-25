const axios = require("axios");
const Post = require("../../models/post");

/* =========================
   FETCH NEWS FROM API
========================= */
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
          image: article.urlToImage || "",
          source: "API",
          analytics: {
            views: 0,
            likes: 0,
            shares: 0
          }
        });

      } catch (err) {
        console.log("Article error:", err.message);
      }
    }

  } catch (err) {
    console.log("News fetch error:", err.message);
  }
}

module.exports = { fetchNewsAndSave };
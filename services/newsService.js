const axios = require("axios");
const Post = require("../models/post");

async function fetchNewsAndSave() {
  console.log("News service started");

  try {
    const response = await axios.get(
      "https://newsapi.org/v2/top-headlines",
      {
        params: {
          country: "us",
          apiKey: process.env.NEWS_API_KEY
        }
      }
    );

    const articles = response?.data?.articles || [];

    console.log("Articles received:", articles.length);

    for (const article of articles) {
      try {
        if (!article?.title) continue;

        const exists = await Post.findOne({ title: article.title });

        if (!exists) {
          await Post.create({
            title: article.title,
            content: article.description || "No content available",
            category: "News",
            thumbnail: article.urlToImage || "/images/default-thumb.jpg",
            mainImage: article.urlToImage || "/images/default-main.jpg",
            analytics: {
              views: 0,
              likes: 0,
              shares: 0
            }
          });
        }

      } catch (articleErr) {
        console.error("ARTICLE PROCESSING ERROR:");
        console.error(articleErr.stack || articleErr);
      }
    }

  } catch (err) {
    console.error("FULL NEWS SERVICE ERROR:");
    console.error(err.stack || JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
  }
}

module.exports = fetchNewsAndSave;
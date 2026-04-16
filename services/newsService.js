console.log("News service started");
console.log("API KEY:", process.env.NEWS_API_KEY);

const axios = require("axios");
const Post = require("../models/post");

const fetchNewsAndSave = async () => {
  try {
    const response = await axios.get(
      `https://newsapi.org/v2/top-headlines?country=ng&pageSize=10&apiKey=${process.env.NEWS_API_KEY}`
    );

    const articles = response.data.articles;

    for (let article of articles) {
      if (!article.title) continue;

      const exists = await Post.findOne({ title: article.title });

      if (!exists) {
        await Post.create({
          title: article.title,
          content:
            article.description ||
            article.content ||
            "No content available",
          author: article.author || "Voxaria News",
          category: article.source?.name || "News",
          thumbnail:
            article.urlToImage || "/images/default-thumb.jpg",
          mainImage:
            article.urlToImage || "/images/default-main.jpg",
          isBreaking: true
        });
      }
    }

    console.log("News synced successfully");
  } catch (error) {
    console.error("NewsAPI error:", error.message);
  }
};

module.exports = fetchNewsAndSave;
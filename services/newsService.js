console.log("News service started");
console.log("API KEY:", process.env.NEWS_API_KEY);

const axios = require("axios");
const slugify = require("slugify");
const Post = require("../models/post");

// simple AI-like summary generator (temporary)
function generateSummary(article) {
  if (article.description) return article.description;
  if (article.content) return article.content.substring(0, 200);
  return "Latest news update from Voxaria.";
}

const fetchNewsAndSave = async () => {
  try {
    const response = await axios.get(
      `https://newsapi.org/v2/everything?q=Nigeria OR Africa OR world&language=en&sortBy=publishedAt&pageSize=10&apiKey=${process.env.NEWS_API_KEY}`
    );

    const articles = response.data.articles;

    console.log("Articles received:", articles.length);

    for (let article of articles) {
      if (!article.title) continue;

      const slug = slugify(article.title, { lower: true, strict: true });

      const exists = await Post.findOne({ slug });

      if (!exists) {
        await Post.create({
          title: article.title,
          slug: slug,
          content:
            article.description ||
            article.content ||
            "No content available",
          author: article.author || "Voxaria News",
          category: article.source?.name || "News",
          thumbnail: article.urlToImage || "/images/default-thumb.jpg",
          mainImage: article.urlToImage || "/images/default-main.jpg",
          isBreaking: true,

          // ✅ ADD AI SUMMARY HERE
          aiSummary: generateSummary(article)
        });

        console.log("Saved:", article.title);
      } else {
        console.log("Skipped duplicate:", article.title);
      }
    }

    console.log("News synced successfully");
  } catch (error) {
    console.error("NewsAPI error:", error.message);
  }
};

module.exports = fetchNewsAndSave;
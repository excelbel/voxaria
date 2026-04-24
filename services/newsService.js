console.log("News service started");
console.log("API KEY:", process.env.NEWS_API_KEY);

const axios = require("axios");
const slugify = require("slugify");
const Post = require("../models/post");

// ✅ Improved AI Summary
function generateSummary(article) {
  const text =
    article.description ||
    article.content ||
    "Latest news update from Voxaria.";

  return text.split(" ").slice(0, 30).join(" ") + "...";
}

// ✅ Read time calculator (avg 200 words/min)
function calculateReadTime(text) {
  const words = text.split(" ").length;
  return Math.ceil(words / 200);
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

      // ✅ Generate slug
      let slug = slugify(article.title, { lower: true, strict: true });

      // ✅ Ensure unique slug
      const existing = await Post.findOne({ slug });
      if (existing) {
        slug = slug + "-" + Date.now();
      }

      // ✅ Prepare content
      const content =
        article.description ||
        article.content ||
        "No content available";

      // ✅ AI Summary
      const aiSummary = generateSummary(article);

      // ✅ Read time
      const readTime = calculateReadTime(content);

      // ✅ Save post
      await Post.create({
        title: article.title,
        slug,
        content,
        aiSummary,
        readTime,
        author: article.author || "Voxaria News",
        category: article.source?.name || "News",
        thumbnail: article.urlToImage || "/images/default-thumb.jpg",
        mainImage: article.urlToImage || "/images/default-main.jpg",
        isBreaking: true
      });

      console.log("Saved:", article.title);
    }

    console.log("News synced successfully");

  } catch (error) {
    console.error("NewsAPI error:", error.message);
  }
};

module.exports = fetchNewsAndSave;
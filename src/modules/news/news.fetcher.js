const axios = require("axios");
const Post = require("../../models/post");

/* =========================
   MULTI SOURCE FETCHER
========================= */
async function fetchNewsAndSave() {
  console.log("News fetcher started");

  try {
    const sources = [
      `https://newsapi.org/v2/top-headlines?country=us&apiKey=${process.env.NEWS_API_KEY}`,
      `https://newsapi.org/v2/top-headlines?country=gb&apiKey=${process.env.NEWS_API_KEY}`
    ];

    let allArticles = [];

    for (const url of sources) {
      try {
        const res = await axios.get(url, { timeout: 10000 });
        const articles = res?.data?.articles || [];
        allArticles = allArticles.concat(articles);
      } catch (err) {
        console.log("Source failed:", err.message);
      }
    }

    console.log("Total articles:", allArticles.length);

    const slugs = [];

    for (const article of allArticles) {
      try {
        if (!article?.title) continue;

        const slug = article.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        const existing = await Post.findOne({ slug });

        if (existing) {
          slugs.push(slug);
          continue;
        }

        await Post.create({
          title: article.title,
          slug,
          content: article.description || "No content available",
          category: "News",
          mainImage: article.urlToImage || "/images/default-main.jpg",
          source: "API",
          views: 0,
          aiProcessed: false,
          createdAt: new Date()
        });

        slugs.push(slug);

      } catch (err) {
        console.log("Article error:", err.message);
      }
    }

    console.log("Saved posts:", slugs.length);
    return slugs;

  } catch (err) {
    console.log("News fetch error:", err.message);
    return [];
  }
}

module.exports = { fetchNewsAndSave };
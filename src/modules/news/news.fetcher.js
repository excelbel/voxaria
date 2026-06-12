const axios = require("axios");
const Post = require("../../models/post");
const { generateNewsPackage } = require("../ai/ai.service");
const { detectCategory } = require("../utils/categoryEngine");

function createSlug(title = "") {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* =========================
   NEWS ENGINE
========================= */
async function fetchNewsAndSave() {
  console.log("News engine running...");

  try {
    const url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=30&apiKey=${process.env.NEWS_API_KEY}`;

    const res = await axios.get(url, { timeout: 15000 });
    const articles = res?.data?.articles || [];

    console.log("Fetched articles:", articles.length);

    for (const article of articles) {
      try {
        if (!article?.title) continue;

        const slug = createSlug(article.title);
        const rawText = `${article.title} ${article.description || ""}`;

        /* =========================
           DUPLICATE CHECK (IMPROVED)
        ========================= */
        const exists = await Post.findOne({
          $or: [
            { slug },
            { title: article.title }
          ]
        });

        if (exists) continue;

        /* =========================
           CATEGORY ENGINE
           (News, Sports, Politics, etc)
        ========================= */
        let category = detectCategory
          ? detectCategory(rawText)
          : "news";

        /* fallback safety */
        const allowed = [
          "news",
          "article",
          "entertainment",
          "international",
          "journal",
          "politics",
          "sports",
          "security"
        ];

        if (!allowed.includes(category)) {
          category = "news";
        }

        /* =========================
           AI PROCESSING (SAFE FALLBACK)
        ========================= */
        let ai = null;

        try {
          ai = await generateNewsPackage(rawText);
        } catch (err) {
          console.log("AI failed, using fallback");
        }

        /* =========================
           CREATE POST
        ========================= */
        await Post.create({
          title: ai?.title || article.title,
          slug,
          content:
            ai?.article ||
            article.description ||
            "No content available",

          category,

          thumbnail: article.urlToImage || "/images/default-thumb.jpg",
          mainImage: article.urlToImage || "/images/default-main.jpg",

          source: "NEWSAPI",
          views: 0,
          isBreaking: false,

          createdAt: new Date()
        });

        console.log("Saved:", slug);

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
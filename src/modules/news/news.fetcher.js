const axios = require("axios");
const Post = require("../../models/post");
const { generateNewsPackage } = require("../ai/ai.service");
const { detectCategory } = require("../categoryEngine");

/* =========================
   CACHE + LOCK
========================= */
let cachedArticles = [];
let lastFetchTime = 0;
let isFetching = false;

/* =========================
   FETCH NEWS
========================= */
async function fetchNewsAndSave() {
  console.log("NEWS FETCHER STARTED");

  const now = Date.now();

  // Prevent overlapping runs
  if (isFetching) {
    console.log("Fetch already running...");
    return [];
  }

  // Use cache for 15 minutes
  if (
    cachedArticles.length > 0 &&
    now - lastFetchTime < 15 * 60 * 1000
  ) {
    console.log("Using cached articles");
    return cachedArticles.map(article => article.slug);
  }

  isFetching = true;

  try {
    if (!process.env.NEWS_API_KEY) {
      throw new Error("NEWS_API_KEY is missing in .env");
    }

    const url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=50&apiKey=${process.env.NEWS_API_KEY}`;

    const res = await axios.get(url, {
      timeout: 15000
    });

    const articles = res.data?.articles || [];

    console.log(`Found ${articles.length} articles`);

    const savedSlugs = [];

    for (const article of articles) {
      try {
        if (!article.title) continue;

        // Generate slug
        let slug = article.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        // Avoid empty slug
        if (!slug) continue;

        // Check existing post
        const exists = await Post.findOne({ slug });

        if (exists) {
          console.log(`Already exists: ${article.title}`);
          savedSlugs.push(slug);
          continue;
        }

        // Clean NewsAPI truncated content
        let cleanContent =
          article.content ||
          article.description ||
          "";

        cleanContent = cleanContent.replace(
          /\[\+\d+\schars\]/g,
          ""
        );

        const rawText = `
${article.title}

${article.description || ""}

${cleanContent}
        `.trim();

        // Detect category
        const category = detectCategory(rawText);

        let ai = null;

try {
  ai = await generateNewsPackage(rawText);
} catch (err) {
  if (err.status === 429 || err.message.includes("429")) {
    console.log("AI quota hit, skipping AI");
    ai = null;
  } else {
    console.log("AI ERROR:", err.message);
  }
}

        const postData = {
          title: ai?.title || article.title,

          slug,

          content:
            ai?.article ||
            cleanContent ||
            article.description ||
            "No content available",

          category,

          thumbnail:
            article.urlToImage ||
            "/images/default-thumb.jpg",

          mainImage:
            article.urlToImage ||
            "/images/default-main.jpg",

          author: article.author || "VOXARIA AI",

          sourceUrl: article.url || "",

          views: 0,

          isBreaking: false,

          createdAt: new Date()
        };

        await Post.create(postData);

        savedSlugs.push(slug);

        console.log(`Saved: ${article.title}`);

      } catch (articleError) {
        console.error(
          "Article error:",
          articleError.message
        );
      }
    }

    cachedArticles = articles;
    lastFetchTime = now;

    console.log("News engine completed");

    return savedSlugs;

  } catch (err) {
    console.error(
      "Fetcher error:",
      err.response?.data || err.message
    );

    return [];

  } finally {
    isFetching = false;
  }
}

module.exports = {
  fetchNewsAndSave
};
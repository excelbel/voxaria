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
   NEWS FEEDS
   NewsAPI free plan supports:
   - country=us  (top-headlines)
   - everything  (keyword/source search)
   Nigeria via sources + keyword queries
========================= */
const NEWS_FEEDS = [
  {
    label: "US Headlines",
    url: (key) =>
      `https://newsapi.org/v2/top-headlines?country=us&pageSize=30&apiKey=${key}`
  },
  {
    label: "Nigeria - Punch & Vanguard",
    url: (key) =>
      `https://newsapi.org/v2/everything?sources=the-punch,vanguard&pageSize=20&sortBy=publishedAt&apiKey=${key}`
  },
  {
    label: "Nigeria - Keyword Search",
    url: (key) =>
      `https://newsapi.org/v2/everything?q=Nigeria+news&language=en&sortBy=publishedAt&pageSize=20&apiKey=${key}`
  }
];

/* =========================
   FETCH NEWS
========================= */
async function fetchNewsAndSave() {
  console.log("NEWS FETCHER STARTED");

  const now = Date.now();

  if (isFetching) {
    console.log("Fetch already running...");
    return [];
  }

  if (
    cachedArticles.length > 0 &&
    now - lastFetchTime < 15 * 60 * 1000
  ) {
    console.log("Using cached articles");
    return cachedArticles.map(a => a.slug);
  }

  isFetching = true;

  try {
    if (!process.env.NEWS_API_KEY) {
      throw new Error("NEWS_API_KEY is missing in .env");
    }

    const key = process.env.NEWS_API_KEY;

    // Fetch all feeds in parallel
    const feedResults = await Promise.allSettled(
      NEWS_FEEDS.map(feed =>
        axios
          .get(feed.url(key), { timeout: 15000 })
          .then(res => {
            const articles = res.data?.articles || [];
            console.log(`${feed.label}: ${articles.length} articles found`);
            return articles;
          })
          .catch(err => {
            console.error(`${feed.label} FAILED:`, err.response?.data?.message || err.message);
            return [];
          })
      )
    );

    // Merge and deduplicate by URL
    const seen = new Set();
    const allArticles = [];

    for (const result of feedResults) {
      if (result.status === "fulfilled") {
        for (const article of result.value) {
          if (article.url && !seen.has(article.url)) {
            seen.add(article.url);
            allArticles.push(article);
          }
        }
      }
    }

    console.log(`Total unique articles: ${allArticles.length}`);

    const savedSlugs = [];

    for (const article of allArticles) {
      try {
        if (!article.title) continue;

        let slug = article.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        if (!slug) continue;

        const exists = await Post.findOne({ slug });

        if (exists) {
          console.log(`Already exists: ${article.title}`);
          savedSlugs.push(slug);
          continue;
        }

        let cleanContent =
          article.content || article.description || "";

        cleanContent = cleanContent.replace(/\[\+\d+\schars\]/g, "");

        const rawText = `
${article.title}

${article.description || ""}

${cleanContent}
        `.trim();

        const category = detectCategory(rawText);

        let ai = null;

        try {
          ai = await generateNewsPackage(rawText);
        } catch (err) {
          if (err.status === 429 || err.message?.includes("429")) {
            console.log("AI quota hit, skipping AI");
          } else {
            console.log("AI ERROR:", err.message);
          }
          ai = null;
        }

        const postData = {
          title:     ai?.title || article.title,
          slug,
          content:   ai?.article || cleanContent || article.description || "No content available",
          category,
          thumbnail: article.urlToImage || "/images/default-thumb.jpg",
          mainImage: article.urlToImage || "/images/default-main.jpg",
          author:    article.author || "VOXARIA AI",
          sourceUrl: article.url || "",
          views:     0,
          isBreaking: false,
          createdAt: new Date()
        };

        await Post.create(postData);
        savedSlugs.push(slug);
        console.log(`Saved: ${article.title}`);

      } catch (articleError) {
        console.error("Article error:", articleError.message);
      }
    }

    cachedArticles = allArticles;
    lastFetchTime = now;

    console.log("News engine completed");
    return savedSlugs;

  } catch (err) {
    console.error("Fetcher error:", err.response?.data || err.message);
    return [];

  } finally {
    isFetching = false;
  }
}

module.exports = { fetchNewsAndSave };
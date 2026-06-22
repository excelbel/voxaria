const axios = require("axios");
const Post = require("../../models/post");
const DeletedPost = require("../../models/deletedPost");

const { generateNewsPackage } = require("../ai/ai.service");
const { detectCategory } = require("../categoryEngine");

/* =========================
   HELPERS
========================= */
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

/* =========================
   CACHE + LOCK
========================= */
let cachedArticles = [];
let lastFetchTime = 0;
let isFetching = false;

/* =========================
   NEWS FEEDS
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
    return [];
  }

  isFetching = true;

  try {
    if (!process.env.NEWS_API_KEY) {
      throw new Error("NEWS_API_KEY missing in .env");
    }

    const apiKey = process.env.NEWS_API_KEY;

    const feedResults = await Promise.allSettled(
      NEWS_FEEDS.map(async (feed) => {
        try {
          const res = await axios.get(feed.url(apiKey), {
            timeout: 15000
          });

          const articles = res.data?.articles || [];

          console.log(`${feed.label}: ${articles.length} articles found`);

          return articles;
        } catch (err) {
          console.log(
            `${feed.label} FAILED:`,
            err.response?.data?.message || err.message
          );
          return [];
        }
      })
    );

    /* =========================
       MERGE ARTICLES
    ========================= */
    const seen = new Set();
    const allArticles = [];

    for (const result of feedResults) {
      if (result.status !== "fulfilled") continue;

      for (const article of result.value) {
        if (!article?.url) continue;
        if (seen.has(article.url)) continue;

        seen.add(article.url);
        allArticles.push(article);
      }
    }

    console.log(`Total unique articles: ${allArticles.length}`);

    const savedSlugs = [];

    /* =========================
       PROCESS ARTICLES (CLEAN VERSION)
    ========================= */
    for (const article of allArticles) {
      try {
        if (!article.title || !article.url) continue;

        const slug = article.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        if (!slug) continue;

        const domain = extractDomain(article.url);

        /* =========================
           CHECK DELETED POSTS
        ========================= */
        const wasDeleted = await DeletedPost.findOne({
          $or: [
            { slug },
            { sourceUrl: article.url },
            { domain }
          ]
        });

        if (wasDeleted) {
          console.log("Blocked deleted:", article.title);
          continue;
        }

        /* =========================
           CHECK DUPLICATES
        ========================= */
        const exists = await Post.findOne({
          $or: [
            { slug },
            { sourceUrl: article.url }
          ]
        });

        if (exists) {
          console.log("Already exists:", article.title);
          continue;
        }

        /* =========================
           CLEAN CONTENT
        ========================= */
        let cleanContent =
          article.content ||
          article.description ||
          "";

        cleanContent = cleanContent.replace(/\[\+\d+\schars\]/g, "");

        if (article.title.length < 20 || cleanContent.length < 30) {
          console.log("Skipped low quality:", article.title);
          continue;
        }

        const rawText = `
${article.title}

${article.description || ""}

${cleanContent}
        `.trim();

        const category = detectCategory(rawText);

        /* =========================
           AI GENERATION (SAFE)
        ========================= */
        let ai = null;

        try {
          ai = await generateNewsPackage(rawText);
        } catch (err) {
          console.log("AI skipped:", err.message);
          ai = null;
        }

        /* =========================
           SAVE POST
        ========================= */
        await Post.create({
          title: ai?.title || article.title,
          slug,
          content: ai?.article || cleanContent || "No content available",
          category,
          thumbnail: article.urlToImage || "/images/default-thumb.jpg",
          mainImage: article.urlToImage || "/images/default-main.jpg",
          author: article.author || "VOXARIA AI",
          source: "newsapi",
          sourceUrl: article.url,
          aiSummary: ai?.summary || "",
          seoDescription: ai?.seoDescription || "",
          imagePrompt: ai?.imagePrompt || "",
          aiProcessed: !!ai,
          views: 0,
          isBreaking: false,
          createdAt: new Date()
        });

        savedSlugs.push(slug);
        console.log("Saved:", article.title);

      } catch (err) {
        console.log("Article error:", err.message);
      }
    }

    cachedArticles = allArticles;
    lastFetchTime = now;

    console.log("News engine completed");
    return savedSlugs;

  } catch (err) {
    console.log("Fetcher error:", err.response?.data || err.message);
    return [];

  } finally {
    isFetching = false;
  }
}

module.exports = {
  fetchNewsAndSave
};
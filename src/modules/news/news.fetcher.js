const Parser = require("rss-parser");
const axios = require("axios");
const cheerio = require("cheerio");
const Post = require("../../models/post");
const DeletedPost = require("../../models/deletedPost");
const { generateNewsPackage } = require("../ai/ai.service");
const { detectCategory } = require("../categoryEngine");

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; VoxariaBot/1.0)" }
});

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

function slugify(text = "") {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* =========================
   SCRAPE OG:IMAGE
   Fetches the article page and
   extracts the og:image meta tag
========================= */
async function scrapeImage(url) {
  try {
    const res = await axios.get(url, {
      timeout: 8000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; VoxariaBot/1.0)"
      }
    });

    const $ = cheerio.load(res.data);

    const ogImage =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      $('meta[property="og:image:url"]').attr("content");

    if (ogImage && ogImage.startsWith("http")) {
      return ogImage;
    }

    return null;
  } catch {
    return null;
  }
}

/* =========================
   SIMILARITY CHECK
========================= */
function getKeywords(title = "") {
  const stopWords = new Set([
    "a", "an", "the", "in", "on", "at", "to", "for",
    "of", "and", "or", "but", "is", "are", "was", "were",
    "it", "its", "as", "by", "with", "from", "that", "this",
    "after", "over", "into", "about", "says", "said"
  ]);
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

function isTooSimilar(titleA, titleB) {
  const wordsA = new Set(getKeywords(titleA));
  const wordsB = new Set(getKeywords(titleB));
  if (wordsA.size === 0 || wordsB.size === 0) return false;

  let matches = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) matches++;
  }

  const similarity = matches / Math.min(wordsA.size, wordsB.size);
  return similarity >= 0.6;
}

/* =========================
   RELEVANCE CHECK
========================= */
const RELEVANCE_KEYWORDS = [
  "nigeria", "nigerian", "lagos", "abuja", "naira",
  "tinubu", "obi", "inec", "efcc", "aso rock",
  "president", "government", "election", "minister", "governor",
  "parliament", "congress", "trump", "biden", "politics", "policy",
  "vote", "campaign", "party", "democrat", "republican",
  "football", "soccer", "nba", "nfl", "fifa", "tennis",
  "cricket", "basketball", "match", "league", "tournament",
  "championship", "world cup", "premier league", "transfer",
  "goal", "score", "player", "coach", "club",
  "movie", "music", "actor", "actress", "celebrity", "hollywood",
  "netflix", "film", "concert", "award", "grammy", "oscar",
  "attack", "crime", "police", "military", "terrorist",
  "shooting", "war", "killed", "bomb", "conflict", "troops",
  "bandits", "kidnap", "armed robbery",
  "united nations", "global", "international", "world",
  "china", "russia", "ukraine", "israel", "iran", "uk",
  "europe", "africa", "middle east",
  "iphone", "android", "google", "apple", "microsoft",
  "ai", "chatgpt", "technology", "startup", "elon musk",
  "research", "study", "scientist", "nasa", "space",
  "health", "disease", "cancer", "vaccine", "climate"
];

function isRelevant(text = "") {
  const t = text.toLowerCase();
  return RELEVANCE_KEYWORDS.some(keyword => t.includes(keyword));
}

/* =========================
   DEFAULTS + LIMITS
========================= */
const DEFAULT_THUMB   = "https://placehold.co/400x300?text=No+Image";
const DEFAULT_MAIN    = "https://placehold.co/800x400?text=No+Image";
const MAX_NEW_ARTICLES = 30;

/* =========================
   CACHE + LOCK
========================= */
let cachedArticles = [];
let lastFetchTime = 0;
let isFetching = false;

/* =========================
   RSS FEEDS
========================= */
const RSS_FEEDS = [
  // ── NIGERIA ──
  { label: "Punch Nigeria",    url: "https://punchng.com/feed/" },
  { label: "Vanguard Nigeria", url: "https://www.vanguardngr.com/feed/" },
  { label: "Channels TV",      url: "https://www.channelstv.com/feed/" },
  { label: "ThisDay Nigeria",  url: "https://www.thisdaylive.com/index.php/feed/" },
  { label: "Premium Times",    url: "https://www.premiumtimesng.com/feed" },
  { label: "Daily Trust",      url: "https://dailytrust.com/feed/" },

  // ── US / INTERNATIONAL ──
  { label: "BBC News",         url: "https://feeds.bbci.co.uk/news/rss.xml" },
  { label: "Al Jazeera",       url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { label: "CNN",              url: "http://rss.cnn.com/rss/edition.rss" },
  { label: "NPR News",         url: "https://feeds.npr.org/1001/rss.xml" },
  { label: "Sky News",         url: "https://feeds.skynews.com/feeds/rss/world.xml" }
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
    const feedResults = await Promise.allSettled(
      RSS_FEEDS.map(async (feed) => {
        try {
          const parsed = await parser.parseURL(feed.url);
          const articles = (parsed.items || []).map(item => ({
            title:       item.title          || "",
            description: item.contentSnippet || item.summary || "",
            content:     item.content        || item.contentSnippet || "",
            url:         item.link           || "",
            urlToImage:  item.enclosure?.url || "",
            author:      item.creator        || parsed.title || feed.label,
            publishedAt: item.pubDate        || item.isoDate || new Date().toISOString()
          }));
          console.log(`${feed.label}: ${articles.length} articles found`);
          return articles;
        } catch (err) {
          console.log(`${feed.label} FAILED:`, err.message);
          return [];
        }
      })
    );

    // Merge and deduplicate by exact URL
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

    // Filter by relevance
    const relevantArticles = allArticles.filter(a =>
      isRelevant(`${a.title} ${a.description}`)
    );

    console.log(`Relevant articles: ${relevantArticles.length}`);

    // Remove near-duplicate titles
    const dedupedArticles = [];
    for (const article of relevantArticles) {
      const isDupe = dedupedArticles.some(saved =>
        isTooSimilar(saved.title, article.title)
      );
      if (!isDupe) dedupedArticles.push(article);
    }

    console.log(`After deduplication: ${dedupedArticles.length}`);

    const savedSlugs = [];
    let savedCount = 0;

    for (const article of dedupedArticles) {
      if (savedCount >= MAX_NEW_ARTICLES) {
        console.log(`Reached max of ${MAX_NEW_ARTICLES} new articles`);
        break;
      }

      try {
        if (!article.title || !article.url) continue;

        const slug = slugify(article.title);
        if (!slug) continue;

        const domain = extractDomain(article.url);

        const wasDeleted = await DeletedPost.findOne({
          $or: [{ slug }, { sourceUrl: article.url }, { domain }]
        });
        if (wasDeleted) {
          console.log("Blocked deleted:", article.title);
          continue;
        }

        const exists = await Post.findOne({
          $or: [{ slug }, { sourceUrl: article.url }]
        });
        if (exists) {
          console.log("Already exists:", article.title);
          continue;
        }

        let cleanContent = article.content || article.description || "";
        cleanContent = cleanContent
          .replace(/\[\+\d+\schars\]/g, "")
          .replace(/<[^>]*>/g, "")
          .trim();

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

        // ── IMAGE: RSS first, then scrape, then placeholder ──
        let imageUrl = article.urlToImage || "";

        if (!imageUrl) {
          console.log(`Scraping image for: ${article.title}`);
          imageUrl = await scrapeImage(article.url) || "";
        }

        const thumbnail = imageUrl || DEFAULT_THUMB;
        const mainImage = imageUrl || DEFAULT_MAIN;

        // AI enhancement
        let ai = null;
        try {
          ai = await generateNewsPackage(rawText);
        } catch (err) {
          console.log("AI skipped:", err.message);
          ai = null;
        }

        await Post.create({
          title:          ai?.title || article.title,
          slug,
          content:        ai?.article || cleanContent || "No content available",
          category,
          thumbnail,
          mainImage,
          author:         article.author || "VOXARIA",
          source:         "rss",
          sourceUrl:      article.url,
          aiSummary:      ai?.summary || "",
          seoDescription: ai?.seoDescription || "",
          imagePrompt:    ai?.imagePrompt || "",
          aiProcessed:    !!ai,
          views:          0,
          isBreaking:     false,
          createdAt:      new Date()
        });

        savedSlugs.push(slug);
        savedCount++;
        console.log(`Saved (${savedCount}/${MAX_NEW_ARTICLES}):`, article.title);

      } catch (err) {
        console.log("Article error:", err.message);
      }
    }

    cachedArticles = allArticles;
    lastFetchTime = now;

    console.log(`News engine completed — ${savedCount} new articles saved`);
    return savedSlugs;

  } catch (err) {
    console.log("Fetcher error:", err.message);
    return [];

  } finally {
    isFetching = false;
  }
}

module.exports = { fetchNewsAndSave };
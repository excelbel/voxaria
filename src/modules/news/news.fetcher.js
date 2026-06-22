const Parser = require("rss-parser");
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
  { label: "Punch Nigeria",       url: "https://punchng.com/feed/" },
  { label: "Vanguard Nigeria",    url: "https://www.vanguardngr.com/feed/" },
  { label: "Channels TV",         url: "https://www.channelstv.com/feed/" },
  { label: "ThisDay Nigeria",     url: "https://www.thisdaylive.com/index.php/feed/" },
  { label: "Premium Times",       url: "https://www.premiumtimesng.com/feed" },  // replaces Guardian Nigeria
  { label: "Daily Trust",         url: "https://dailytrust.com/feed/" },          // replaces AP News

  // ── US / INTERNATIONAL ──
  { label: "BBC News",            url: "https://feeds.bbci.co.uk/news/rss.xml" },
  { label: "Al Jazeera",          url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { label: "CNN",                 url: "http://rss.cnn.com/rss/edition.rss" },
  { label: "NPR News",            url: "https://feeds.npr.org/1001/rss.xml" },         // replaces Reuters
  { label: "Sky News",            url: "https://feeds.skynews.com/feeds/rss/world.xml" }
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
    // Fetch all RSS feeds in parallel
    const feedResults = await Promise.allSettled(
      RSS_FEEDS.map(async (feed) => {
        try {
          const parsed = await parser.parseURL(feed.url);
          const articles = (parsed.items || []).map(item => ({
            title:       item.title            || "",
            description: item.contentSnippet   || item.summary || "",
            content:     item.content          || item.contentSnippet || "",
            url:         item.link             || "",
            urlToImage:  item.enclosure?.url   || "",
            author:      item.creator          || parsed.title || feed.label,
            publishedAt: item.pubDate          || item.isoDate || new Date().toISOString()
          }));
          console.log(`${feed.label}: ${articles.length} articles found`);
          return articles;
        } catch (err) {
          console.log(`${feed.label} FAILED:`, err.message);
          return [];
        }
      })
    );

    // Merge and deduplicate by URL
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

    for (const article of allArticles) {
      try {
        if (!article.title || !article.url) continue;

        const slug = slugify(article.title);
        if (!slug) continue;

        const domain = extractDomain(article.url);

        // Check deleted posts
        const wasDeleted = await DeletedPost.findOne({
          $or: [{ slug }, { sourceUrl: article.url }, { domain }]
        });
        if (wasDeleted) {
          console.log("Blocked deleted:", article.title);
          continue;
        }

        // Check duplicates
        const exists = await Post.findOne({
          $or: [{ slug }, { sourceUrl: article.url }]
        });
        if (exists) {
          console.log("Already exists:", article.title);
          continue;
        }

        // Clean content
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

        // AI enhancement (safe — skip if quota hit)
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
          thumbnail:      article.urlToImage || "/images/default-thumb.jpg",
          mainImage:      article.urlToImage || "/images/default-main.jpg",
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
    console.log("Fetcher error:", err.message);
    return [];

  } finally {
    isFetching = false;
  }
}

module.exports = { fetchNewsAndSave };

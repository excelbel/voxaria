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
`https://newsapi.org/v2/top-headlines?country=gb&apiKey=${process.env.NEWS_API_KEY}`,
`https://newsapi.org/v2/top-headlines?country=us&category=sports&apiKey=${process.env.NEWS_API_KEY}`,
`https://newsapi.org/v2/top-headlines?country=us&category=entertainment&apiKey=${process.env.NEWS_API_KEY}`,
`https://newsapi.org/v2/top-headlines?country=us&category=business&apiKey=${process.env.NEWS_API_KEY}`,
`https://newsapi.org/v2/top-headlines?country=us&category=technology&apiKey=${process.env.NEWS_API_KEY}`
];

```
let allArticles = [];

for (const url of sources) {
  try {
    const response = await axios.get(url, {
      timeout: 10000
    });

    const articles = response?.data?.articles || [];

    allArticles = allArticles.concat(articles);

  } catch (err) {
    console.log("Source failed:", err.message);
  }
}

console.log("Total fetched articles:", allArticles.length);

const savedSlugs = [];

for (const article of allArticles) {
  try {
    if (!article?.title) continue;

    const slug = article.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const exists = await Post.findOne({ slug });

    if (exists) {
      continue;
    }

    const text = (
      article.title +
      " " +
      (article.description || "")
    ).toLowerCase();

    let category = "News";

    if (
      text.includes("president") ||
      text.includes("election") ||
      text.includes("government") ||
      text.includes("senate") ||
      text.includes("minister") ||
      text.includes("politics")
    ) {
      category = "Politics";
    }
    else if (
      text.includes("football") ||
      text.includes("soccer") ||
      text.includes("basketball") ||
      text.includes("fifa") ||
      text.includes("nba") ||
      text.includes("sports")
    ) {
      category = "Sports";
    }
    else if (
      text.includes("movie") ||
      text.includes("music") ||
      text.includes("actor") ||
      text.includes("celebrity") ||
      text.includes("entertainment")
    ) {
      category = "Entertainment";
    }
    else if (
      text.includes("security") ||
      text.includes("attack") ||
      text.includes("military") ||
      text.includes("terror") ||
      text.includes("crime") ||
      text.includes("war")
    ) {
      category = "Security";
    }
    else if (
      text.includes("international") ||
      text.includes("global") ||
      text.includes("world") ||
      text.includes("foreign")
    ) {
      category = "International";
    }
    else if (
      text.includes("editorial") ||
      text.includes("analysis") ||
      text.includes("opinion")
    ) {
      category = "Journal";
    }
    else if (
      (article.description || "").length > 300
    ) {
      category = "Article";
    }

    await Post.create({
      title: article.title,
      slug,
      content: article.description || "No content available",
      category,
      mainImage:
        article.urlToImage ||
        "/images/default-main.jpg",
      author: article.author || "Voxaria News",
      views: 0,
      aiProcessed: false,
      createdAt: new Date()
    });

    savedSlugs.push(slug);

  } catch (err) {
    console.log("Article error:", err.message);
  }
}

console.log("New posts saved:", savedSlugs.length);

return savedSlugs;
```

} catch (err) {
console.log("News fetch error:", err.message);
return [];
}
}

module.exports = {
fetchNewsAndSave
};

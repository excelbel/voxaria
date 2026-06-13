const axios = require("axios");
const Post = require("../../models/post");
const { generateNewsPackage } = require("../ai/ai.service");
const { detectCategory } = require("../categoryEngine");

async function fetchNewsAndSave() {
  console.log("NEWS FETCHER STARTED");

  try {
    const url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=20&apiKey=${process.env.NEWS_API_KEY}`;

    const res = await axios.get(url);
    const articles = res.data.articles || [];

    console.log(`Found ${articles.length} articles`);

    for (const article of articles) {
      try {
        if (!article.title) continue;

        const slug = article.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        const exists = await Post.findOne({ slug });

        if (exists) {
          console.log("Already exists:", article.title);
          continue;
        }

        const rawText = `
${article.title}
${article.description || ""}
${article.content || ""}
`;

        const category = detectCategory(rawText);

        console.log("TITLE:", article.title);
        console.log("CATEGORY:", category);

        let ai = null;

        try {
          ai = await generateNewsPackage(rawText);
        } catch (aiError) {
          console.log("AI ERROR:", aiError.message);
        }

        await Post.create({
          title: ai?.title || article.title,

          slug,

          content:
            ai?.article ||
            article.content ||
            article.description ||
            "No content available",

          category,

          thumbnail:
            article.urlToImage ||
            "/images/default-thumb.jpg",

          mainImage:
            article.urlToImage ||
            "/images/default-main.jpg",

          author: "VOXARIA AI",

          views: 0,

          isBreaking: false,

          createdAt: new Date()
        });

        console.log("Saved:", article.title);

      } catch (articleError) {
        console.log(
          "Article error:",
          articleError.message
        );
      }
    }

    console.log("News engine completed");

  } catch (err) {
    console.log("Fetcher error:", err.message);
  }
}

module.exports = {
  fetchNewsAndSave
};
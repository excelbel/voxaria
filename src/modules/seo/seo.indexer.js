const { google } = require("googleapis");
const Post = require("../../models/post");

const BASE_URL = "https://voxaria.org";

/* =========================
   GOOGLE PING
========================= */
async function pingGoogle(url) {
  try {
    if (!process.env.GOOGLE_INDEXING_ENABLED) return;

    const auth = new google.auth.GoogleAuth({
      keyFile: "google-key.json",
      scopes: ["https://www.googleapis.com/auth/indexing"]
    });

    const client = await auth.getClient();

    await google.indexing("v3").urlNotifications.publish({
      auth: client,
      requestBody: {
        url,
        type: "URL_UPDATED"
      }
    });

  } catch (err) {
    console.log("SEO ping failed:", err.message);
  }
}

/* =========================
   RUN SEO INDEXING
========================= */
async function runSEO() {
  try {
    const posts = await Post.find().limit(20).lean();

    for (const post of posts) {
      if (!post.slug) continue;

      await pingGoogle(`${BASE_URL}/news/${post.slug}`);
    }
  } catch (err) {
    console.log("SEO batch error:", err.message);
  }
}

module.exports = { runSEO };
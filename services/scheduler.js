const { google } = require("googleapis");
const Post = require("../models/post");

const BASE_URL = "https://voxaria.org";

async function pingGoogle(url) {
  try {
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
    console.log("SEO ping failed");
  }
}

async function runSEO() {
  const posts = await Post.find().limit(20);

  for (let post of posts) {
    await pingGoogle(`${BASE_URL}/post/${post.slug}`);
  }
}

module.exports = { runSEO };
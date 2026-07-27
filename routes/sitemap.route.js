// routes/sitemap.route.js
//
// Generates sitemap.xml dynamically from published posts + static pages.
// Mount this in routes/index.js (see instructions below).

const express = require("express");
const router = express.Router();
const { SitemapStream, streamToPromise } = require("sitemap");
const { Readable } = require("stream");
const Post = require("../src/models/post");

router.get("/sitemap.xml", async (req, res) => {
  try {
    res.header("Content-Type", "application/xml");

    const baseUrl =
      process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;

    // Static pages that always exist
    const staticLinks = [
      { url: "/", changefreq: "hourly", priority: 1.0 },
      { url: "/about", changefreq: "monthly", priority: 0.6 },
      { url: "/contact", changefreq: "monthly", priority: 0.5 },
      { url: "/privacy-policy", changefreq: "yearly", priority: 0.3 },
    ];

    // Published posts
    const posts = await Post.find({ published: true })
      .select("slug createdAt")
      .lean();

    const postLinks = posts.map((post) => ({
      url: `/news/${post.slug}`,
      lastmod: post.createdAt ? new Date(post.createdAt).toISOString() : undefined,
      changefreq: "daily",
      priority: 0.8,
    }));

    // Category pages, built from the enum on the Post model
    const categories = [
      "News", "Article", "Politics", "Security", "International",
      "Sports", "Football", "Basketball", "Athletics",
      "Entertainment", "Lifestyle", "Music", "Movies",
      "Technology", "Science", "AI",
      "Finance", "Economy", "Markets",
      "Health", "Journals", "Wellness",
    ];
    const categoryLinks = categories.map((cat) => ({
      url: `/category/${encodeURIComponent(cat)}`,
      changefreq: "daily",
      priority: 0.5,
    }));

    const links = [...staticLinks, ...postLinks, ...categoryLinks];

    const stream = new SitemapStream({ hostname: baseUrl });
    const xml = await streamToPromise(Readable.from(links).pipe(stream));

    res.send(xml.toString());
  } catch (err) {
    console.error("SITEMAP ERROR:", err.message);
    res.status(500).end();
  }
});

module.exports = router;
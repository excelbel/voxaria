const mongoose = require("mongoose");
const slugify = require("slugify");
require("dotenv").config();

const Post = require("./models/post");

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const posts = await Post.find();

  for (let post of posts) {
    if (!post.slug) {
      post.slug = slugify(post.title, { lower: true, strict: true });
      await post.save();
      console.log("Updated:", post.title);
    }
  }

  console.log("All slugs added");
  process.exit();
});
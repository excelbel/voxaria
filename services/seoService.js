function generateKeywords(post) {
  const words = post.title.split(" ");

  return [
    ...words,
    "latest news",
    "breaking news",
    "voxaria news"
  ];
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
}

module.exports = { generateKeywords, generateSlug };
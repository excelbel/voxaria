function generateImage(title = "news") {
  if (!title) title = "breaking news";

  const query = encodeURIComponent(title);

  return `https://source.unsplash.com/1200x600/?news,${query}`;
}

module.exports = { generateImage };
async function generateImage(title) {
  // placeholder production-safe system
  return `https://source.unsplash.com/1200x600/?${encodeURIComponent(title)}`;
}

module.exports = generateImage;
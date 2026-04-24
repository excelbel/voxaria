// SIMPLE AI IMAGE PLACEHOLDER SERVICE
// Replace later with DALL·E or Stability AI

module.exports = async function generateImage(title) {
  const encoded = encodeURIComponent(title);

  // Using free image generation fallback (Unsplash)
  return `https://source.unsplash.com/1200x800/?${encoded}`;
};
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* =========================
   NEWS GENERATOR (FULL ARTICLE)
========================= */
async function generateNewsPackage(text) {
  try {
    if (!text) return null;

    const prompt = `
You are a senior newsroom editor.

Rewrite the input into a FULL professional news article.

Rules:
- 800 to 1200 words
- proper paragraphs
- no bullet points
- journalistic tone
- human readable
- SEO optimized headline

Return ONLY valid JSON:

{
  "title": "",
  "article": "",
  "summary": "",
  "category": "",
  "seoDescription": "",
  "imagePrompt": ""
}

INPUT:
${text}
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a professional newsroom AI editor." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    });

    const content = response.choices?.[0]?.message?.content;

    return JSON.parse(content);

  } catch (err) {
    console.log("AI ERROR:", err.message);

    return {
      title: "Untitled News",
      article: text,
      summary: "",
      category: "News",
      seoDescription: "",
      imagePrompt: ""
    };
  }
}

/* =========================
   BREAKING DETECTION
========================= */
function isBreaking(text = "") {
  const t = text.toLowerCase();

  return (
    t.includes("breaking") ||
    t.includes("urgent") ||
    t.includes("attack") ||
    t.includes("killed") ||
    t.includes("explosion") ||
    t.includes("crisis") ||
    t.includes("death") ||
    t.includes("war")
  );
}

/* =========================
   BREAKING NEWS FILTER (FIX FOR YOUR ERROR)
========================= */
function getBreakingNews(posts = []) {
  if (!Array.isArray(posts)) return [];

  return posts
    .filter(p =>
      p?.isBreaking === true ||
      (p?.views || 0) >= 100
    )
    .slice(0, 5);
}

/* =========================
   EXPORTS
========================= */
module.exports = {
  generateNewsPackage,
  isBreaking,
  getBreakingNews
};
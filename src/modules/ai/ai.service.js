const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* =========================
   NEWS PACKAGE GENERATOR
   (FULL ARTICLE + SEO + SUMMARY)
========================= */
async function generateNewsPackage(text) {
  try {
    if (!text) return null;

    const prompt = `
You are a professional newsroom AI.

Turn the input into:
1. A strong SEO title
2. A news article (clean, readable, engaging)
3. A short summary (2-3 lines)
4. Category (News, Politics, Sports, Entertainment, Tech, World, etc.)
5. SEO description (max 155 characters)
6. Image prompt (for blog header image)
7. Breaking score (0-100 based on urgency)

INPUT:
${text}

Return ONLY valid JSON in this format:
{
  "title": "",
  "article": "",
  "summary": "",
  "category": "",
  "seoDescription": "",
  "imagePrompt": "",
  "breakingScore": 0
}
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a professional newsroom AI." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    });

    const content = response.choices?.[0]?.message?.content;

    return JSON.parse(content);

  } catch (err) {
    console.error("AI PACKAGE ERROR:", err.message);

    return {
      title: null,
      article: text,
      summary: "",
      category: "News",
      seoDescription: "",
      imagePrompt: "",
      breakingScore: 0
    };
  }
}

/* =========================
   BREAKING NEWS EXTRACTOR
   (FIXES YOUR getBreakingNews ERROR)
========================= */
function getBreakingNews(posts = []) {
  if (!Array.isArray(posts)) return [];

  return posts
    .filter(p => p?.breakingScore >= 70 || p?.isBreaking === true)
    .slice(0, 5);
}

/* =========================
   EXPORTS
========================= */
module.exports = {
  generateNewsPackage,
  getBreakingNews
};
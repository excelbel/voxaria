const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateNewsPackage(text) {
  try {
    const prompt = `
You are a senior newsroom editor.

Rewrite this into a FULL professional news article.

Rules:
- 800 to 1200 words
- proper paragraphs
- no bullet points
- real journalism tone

Return JSON:
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
        { role: "system", content: "You are a newsroom AI." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    });

    return JSON.parse(response.choices[0].message.content);

  } catch (err) {
    console.log("AI ERROR:", err.message);
    return null;
  }
}

/* =========================
   BREAKING DETECTOR
========================= */
function isBreaking(text = "") {
  const t = text.toLowerCase();

  return (
    t.includes("breaking") ||
    t.includes("urgent") ||
    t.includes("attack") ||
    t.includes("killed") ||
    t.includes("explosion") ||
    t.includes("crisis")
  );
}

/* =========================
   BREAKING NEWS FILTER
========================= */
function getBreakingNews(posts = []) {
  return posts.filter(p => isBreaking(p.title || p.content || ""));
}

module.exports = {
  generateNewsPackage,
  isBreaking,
  getBreakingNews
};
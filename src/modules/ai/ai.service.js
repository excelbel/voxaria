const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* =========================
   QUOTA GUARD
   Once a 429 is hit, skip AI
   for 1 hour before retrying
========================= */
let quotaExhausted = false;
let quotaResetTime = 0;

const QUOTA_COOLDOWN = 60 * 60 * 1000; // 1 hour

async function generateNewsPackage(text) {
  // Skip if quota is exhausted
  if (quotaExhausted) {
    if (Date.now() < quotaResetTime) {
      return null; // silent skip — no log spam
    } else {
      // Cooldown passed, try again
      quotaExhausted = false;
      console.log("AI quota cooldown passed, retrying...");
    }
  }

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

    const raw = response.choices[0].message.content;

    // Strip markdown code fences if present
    const clean = raw.replace(/```json|```/g, "").trim();

    return JSON.parse(clean);

  } catch (err) {
    // Detect quota error and engage cooldown
    if (
      err.status === 429 ||
      err.message?.includes("429") ||
      err.message?.includes("quota")
    ) {
      if (!quotaExhausted) {
        quotaExhausted = true;
        quotaResetTime = Date.now() + QUOTA_COOLDOWN;
        console.log("AI quota hit — pausing AI for 1 hour");
      }
      return null;
    }

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
const axios = require("axios");

/* =========================
   BASIC AI CALL (IF USING API)
   Replace with OpenAI / Gemini / etc
========================= */
async function callAI(prompt) {
  // Example placeholder (replace with real API)
  // You can plug OpenAI, Claude, Gemini here

  return `AI_RESPONSE: ${prompt}`;
}

/* =========================
   BBC STYLE WRITER
========================= */
async function bbcWriter(title, content) {
  const prompt = `
You are a BBC World News editor.

Rewrite the content professionally:

Rules:
- formal journalism tone
- clear structure
- no exaggeration
- no repetition
- global news standard

TITLE: ${title}

CONTENT:
${content}

Return as clean HTML article.
`;

  return await callAI(prompt);
}

/* =========================
   NEWS SUMMARY GENERATOR
========================= */
async function generateSummary(text) {
  const prompt = `
Summarize this news article in a clear, short, professional tone:

TEXT:
${text}

Return 3–5 sentences only.
`;

  return await callAI(prompt);
}

/* =========================
   HEADLINE OPTIMIZER
========================= */
async function generateHeadline(title) {
  const prompt = `
Improve this news headline for clarity and impact:

TITLE:
${title}

Rules:
- keep it short
- journalistic tone
- no clickbait

Return only the headline.
`;

  return await callAI(prompt);
}

/* =========================
   AI PACKAGE EXPORT
========================= */
module.exports = {
  bbcWriter,
  generateSummary,
  generateHeadline
};
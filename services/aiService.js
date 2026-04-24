const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// SIMPLE CACHE (in-memory)
const cache = new Map();

async function generateSummary(content) {
  if (!content) return "";

  // check cache first
  if (cache.has(content)) {
    return cache.get(content);
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Summarize this article in a clear, engaging news style."
      },
      {
        role: "user",
        content
      }
    ],
    temperature: 0.5
  });

  const summary = response.choices[0].message.content;

  // store in cache
  cache.set(content, summary);

  return summary;
}

module.exports = { generateSummary };
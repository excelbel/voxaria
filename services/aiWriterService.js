const { generateSummary } = require("./aiService");

async function bbcWriter(title, content) {
  const prompt = `
You are BBC World News editorial system.

Rewrite into:
- global journalism style
- formal BBC tone
- factual reporting
- structured article
- no repetition

TITLE: ${title}
CONTENT: ${content}

Return HTML article.
`;

  return await generateSummary(prompt, { mode: "article" });
}

module.exports = { bbcWriter };
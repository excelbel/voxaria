const { generateSummary } = require("./aiService");

async function bbcWriter(title, content) {
  const prompt = `
You are BBC World News editorial team.

Rewrite professionally:
- strong headline
- journalistic structure
- factual tone
- no fluff
- global news style

TITLE: ${title}
CONTENT: ${content}

Return HTML article.
`;

  return generateSummary(prompt, { mode: "article" });
}

module.exports = { bbcWriter };
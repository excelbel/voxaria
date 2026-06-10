const OpenAI = require("openai");

const client = new OpenAI({
apiKey: process.env.OPENAI_API_KEY
});

/* =========================
NEWS PACKAGE GENERATOR
========================= */
async function generateNewsPackage(text) {
try {
if (!text) return null;

```
const prompt = `
```

You are an elite international newsroom editor working for a major global media company.

Transform the source information into a complete, professional, publication-ready news article.

RULES:

1. Create a compelling SEO headline.
2. Write a detailed article between 1000 and 1500 words.
3. Use proper journalistic style.
4. Expand the available information intelligently.
5. Add context, background, analysis and implications.
6. Do NOT invent quotes from real people.
7. Use HTML formatting.
8. Use sections and subheadings.
9. Make the article feel like a premium publication.
10. Avoid repeating sentences.
11. Write in clear English.

ARTICLE STRUCTURE:

<h2>Introduction</h2>

<h2>What Happened</h2>

<h2>Background</h2>

<h2>Key Developments</h2>

<h2>Analysis and Impact</h2>

<h2>What Happens Next</h2>

<h2>Conclusion</h2>

Also generate:

• SEO title
• Summary (2 to 3 sentences)
• Category
• SEO description (maximum 155 characters)
• Detailed image prompt for AI image generation
• Breaking score from 0 to 100

SOURCE MATERIAL:

${text}

Return ONLY valid JSON.

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

```
const response = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    {
      role: "system",
      content:
        "You are a world class journalist and newsroom editor. Always return valid JSON only."
    },
    {
      role: "user",
      content: prompt
    }
  ],
  temperature: 0.8,
  max_tokens: 4000,
  response_format: {
    type: "json_object"
  }
});

const content =
  response.choices?.[0]?.message?.content || "{}";

return JSON.parse(content);
```

} catch (err) {
console.error("AI PACKAGE ERROR:", err.message);

```
return {
  title: null,
  article: text,
  summary: "",
  category: "News",
  seoDescription: "",
  imagePrompt: "",
  breakingScore: 0
};
```

}
}

/* =========================
BREAKING NEWS EXTRACTOR
========================= */
function getBreakingNews(posts = []) {
if (!Array.isArray(posts)) return [];

return posts
.filter(
post =>
post?.breakingScore >= 70 ||
post?.isBreaking === true
)
.slice(0, 5);
}

/* =========================
EXPORTS
========================= */
module.exports = {
generateNewsPackage,
getBreakingNews
};

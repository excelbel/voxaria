const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const generateSummary = async (text) => {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Summarize news articles in simple clear English in 3 sentences."
        },
        {
          role: "user",
          content: text
        }
      ]
    });

    return response.choices[0].message.content;
  } catch (err) {
    console.error("AI error:", err.message);
    return "";
  }
};

module.exports = generateSummary;
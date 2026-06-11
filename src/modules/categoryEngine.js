function detectCategory(text = "") {
  const t = text.toLowerCase();

  if (t.includes("election") || t.includes("government")) return "politics";
  if (t.includes("sport") || t.includes("football")) return "sports";
  if (t.includes("movie") || t.includes("music")) return "entertainment";
  if (t.includes("crime") || t.includes("police") || t.includes("security")) return "security";
  if (t.includes("tech") || t.includes("ai")) return "news";
  if (t.includes("world") || t.includes("international")) return "international";
  if (t.includes("journal")) return "journal";

  return "news";
}

module.exports = { detectCategory };
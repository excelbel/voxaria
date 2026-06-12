function detectCategory(text = "") {
  const t = text.toLowerCase();

  if (t.includes("sport") || t.includes("football") || t.includes("match")) {
    return "sports";
  }

  if (t.includes("politic") || t.includes("election") || t.includes("government")) {
    return "politics";
  }

  if (t.includes("war") || t.includes("security") || t.includes("attack")) {
    return "security";
  }

  if (t.includes("entertainment") || t.includes("movie") || t.includes("music")) {
    return "entertainment";
  }

  if (t.includes("journal") || t.includes("analysis")) {
    return "journal";
  }

  if (t.includes("international") || t.includes("world")) {
    return "international";
  }

  return "news";
}

module.exports = { detectCategory };
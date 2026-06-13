function detectCategory(text = "") {
  const t = text.toLowerCase();

  if (t.includes("politic") || t.includes("election") || t.includes("government")) {
    return "Politics";
  }

  if (t.includes("sport") || t.includes("football") || t.includes("match")) {
    return "Sports";
  }

  if (t.includes("entertainment") || t.includes("movie") || t.includes("music")) {
    return "Entertainment";
  }

  if (t.includes("security") || t.includes("attack") || t.includes("crime")) {
    return "Security";
  }

  if (t.includes("journal") || t.includes("research") || t.includes("study")) {
    return "Journals";
  }

  if (t.includes("international") || t.includes("world")) {
    return "International";
  }

  if (t.includes("article")) {
    return "Article";
  }

  return "News";
}

module.exports = { detectCategory };
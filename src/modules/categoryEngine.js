function detectCategory(text = "") {
  const t = text.toLowerCase();

  /* POLITICS */
  if (
    t.includes("politic") ||
    t.includes("election") ||
    t.includes("government") ||
    t.includes("president") ||
    t.includes("senate") ||
    t.includes("minister") ||
    t.includes("parliament") ||
    t.includes("governor") ||
    t.includes("lawmaker") ||
    t.includes("campaign") ||
    t.includes("vote")
  ) {
    return "Politics";
  }

  /* SPORTS */
  if (
    t.includes("sport") ||
    t.includes("football") ||
    t.includes("soccer") ||
    t.includes("basketball") ||
    t.includes("tennis") ||
    t.includes("fifa") ||
    t.includes("uefa") ||
    t.includes("premier league") ||
    t.includes("match") ||
    t.includes("player") ||
    t.includes("coach") ||
    t.includes("championship")
  ) {
    return "Sports";
  }

  /* ENTERTAINMENT */
  if (
    t.includes("movie") ||
    t.includes("music") ||
    t.includes("celebrity") ||
    t.includes("actor") ||
    t.includes("actress") ||
    t.includes("film") ||
    t.includes("netflix") ||
    t.includes("showbiz") ||
    t.includes("award") ||
    t.includes("concert") ||
    t.includes("entertainment")
  ) {
    return "Entertainment";
  }

  /* SECURITY */
  if (
    t.includes("security") ||
    t.includes("attack") ||
    t.includes("crime") ||
    t.includes("terror") ||
    t.includes("military") ||
    t.includes("police") ||
    t.includes("kidnap") ||
    t.includes("armed") ||
    t.includes("violence") ||
    t.includes("war")
  ) {
    return "Security";
  }

  /* JOURNALS */
  if (
    t.includes("research") ||
    t.includes("study") ||
    t.includes("scientist") ||
    t.includes("science") ||
    t.includes("academic") ||
    t.includes("journal") ||
    t.includes("university")
  ) {
    return "Journals";
  }

  /* INTERNATIONAL */
  if (
    t.includes("world") ||
    t.includes("global") ||
    t.includes("international") ||
    t.includes("foreign") ||
    t.includes("united nations") ||
    t.includes("china") ||
    t.includes("russia") ||
    t.includes("ukraine") ||
    t.includes("europe") ||
    t.includes("africa") ||
    t.includes("asia")
  ) {
    return "International";
  }

  /* ARTICLE */
  if (
    t.includes("opinion") ||
    t.includes("analysis") ||
    t.includes("editorial") ||
    t.includes("article")
  ) {
    return "Article";
  }

  return "News";
}

module.exports = { detectCategory };
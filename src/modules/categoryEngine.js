function detectCategory(text = "") {
  const t = text.toLowerCase();

  // Politics
  if (
    t.includes("politic") ||
    t.includes("election") ||
    t.includes("government") ||
    t.includes("president") ||
    t.includes("senate") ||
    t.includes("congress") ||
    t.includes("minister") ||
    t.includes("governor") ||
    t.includes("parliament") ||
    t.includes("trump") ||
    t.includes("biden")
  ) {
    return "Politics";
  }

  // Sports (FIXED)
  if (
    t.includes("sport") ||
    t.includes("football") ||
    t.includes("soccer") ||
    t.includes("nba") ||
    t.includes("nfl") ||
    t.includes("fifa") ||
    t.includes("tennis") ||
    t.includes("cricket") ||
    t.includes("basketball") ||
    t.includes("baseball") ||
    t.includes("match") ||
    t.includes("league") ||
    t.includes("cup") ||
    t.includes("tournament") ||
    t.includes("win") ||
    t.includes("won") ||
    t.includes("victory") ||
    t.includes("championship")
  ) {
    return "Sports";
  }

  // Entertainment
  if (
    t.includes("movie") ||
    t.includes("music") ||
    t.includes("actor") ||
    t.includes("actress") ||
    t.includes("celebrity") ||
    t.includes("hollywood") ||
    t.includes("netflix") ||
    t.includes("tv show") ||
    t.includes("film") ||
    t.includes("concert") ||
    t.includes("entertainment")
  ) {
    return "Entertainment";
  }

  // Security
  if (
    t.includes("attack") ||
    t.includes("crime") ||
    t.includes("police") ||
    t.includes("military") ||
    t.includes("terrorist") ||
    t.includes("shooting") ||
    t.includes("war") ||
    t.includes("security") ||
    t.includes("armed") ||
    t.includes("killed")
  ) {
    return "Security";
  }

  // International
  if (
    t.includes("world") ||
    t.includes("international") ||
    t.includes("global") ||
    t.includes("foreign") ||
    t.includes("united nations") ||
    t.includes("eu") ||
    t.includes("china") ||
    t.includes("russia") ||
    t.includes("ukraine")
  ) {
    return "International";
  }

  // Journals
  if (
    t.includes("research") ||
    t.includes("study") ||
    t.includes("scientist") ||
    t.includes("university") ||
    t.includes("academic") ||
    t.includes("journal")
  ) {
    return "Journals";
  }

  // Article (optional deep content)
  if (
    t.includes("exclusive") ||
    t.includes("investigation") ||
    t.includes("deep dive") ||
    t.includes("explainer") ||
    t.includes("opinion") ||
    t.includes("analysis") ||
    t.includes("special report")
  ) {
    return "Article";
  }

  return "News";
}

module.exports = { detectCategory };
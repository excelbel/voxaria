function detectCategory(text = "") {
  const t = text.toLowerCase();

  // Politics
  if (
    t.includes("politic") || t.includes("election") ||
    t.includes("government") || t.includes("president") ||
    t.includes("senate") || t.includes("congress") ||
    t.includes("minister") || t.includes("governor") ||
    t.includes("parliament") || t.includes("trump") ||
    t.includes("biden") || t.includes("tinubu") ||
    t.includes("campaign") || t.includes("vote") ||
    t.includes("inec") || t.includes("party") ||
    t.includes("democrat") || t.includes("republican") ||
    t.includes("aso rock") || t.includes("atiku")
  ) return "Politics";

  // Security
  if (
    t.includes("attack") || t.includes("crime") ||
    t.includes("police") || t.includes("military") ||
    t.includes("terrorist") || t.includes("shooting") ||
    t.includes("war") || t.includes("security") ||
    t.includes("armed") || t.includes("killed") ||
    t.includes("bandit") || t.includes("kidnap") ||
    t.includes("bomb") || t.includes("troops") ||
    t.includes("conflict") || t.includes("army") ||
    t.includes("insurgent") || t.includes("massacre")
  ) return "Security";

  // Football
  if (
    t.includes("premier league") || t.includes("champions league") ||
    t.includes("world cup") || t.includes("fifa") ||
    t.includes("football") || t.includes("soccer") ||
    t.includes("super eagles") || t.includes("goal") ||
    t.includes("transfer") || t.includes("manager") ||
    t.includes("messi") || t.includes("ronaldo") ||
    t.includes("arsenal") || t.includes("chelsea") ||
    t.includes("manchester") || t.includes("barcelona") ||
    t.includes("real madrid") || t.includes("serie a") ||
    t.includes("bundesliga") || t.includes("la liga")
  ) return "Football";

  // Basketball
  if (
    t.includes("nba") || t.includes("basketball") ||
    t.includes("lakers") || t.includes("warriors") ||
    t.includes("lebron") || t.includes("curry")
  ) return "Basketball";

  // Athletics
  if (
    t.includes("athletics") || t.includes("olympics") ||
    t.includes("marathon") || t.includes("sprint") ||
    t.includes("100m") || t.includes("track and field")
  ) return "Athletics";

  // Sports (general)
  if (
    t.includes("sport") || t.includes("tennis") ||
    t.includes("cricket") || t.includes("baseball") ||
    t.includes("nfl") || t.includes("rugby") ||
    t.includes("tournament") || t.includes("championship") ||
    t.includes("league") || t.includes("match") ||
    t.includes("player") || t.includes("coach") ||
    t.includes("club") || t.includes("score")
  ) return "Sports";

  // Music
  if (
    t.includes("music") || t.includes("song") ||
    t.includes("album") || t.includes("concert") ||
    t.includes("grammy") || t.includes("afrobeats") ||
    t.includes("rapper") || t.includes("singer") ||
    t.includes("billboard") || t.includes("spotify")
  ) return "Music";

  // Movies
  if (
    t.includes("movie") || t.includes("film") ||
    t.includes("nollywood") || t.includes("hollywood") ||
    t.includes("netflix") || t.includes("cinema") ||
    t.includes("actor") || t.includes("actress") ||
    t.includes("oscar") || t.includes("box office")
  ) return "Movies";

  // Lifestyle
  if (
    t.includes("lifestyle") || t.includes("fashion") ||
    t.includes("celebrity") || t.includes("beauty") ||
    t.includes("wedding") || t.includes("food") ||
    t.includes("travel") || t.includes("luxury") ||
    t.includes("relationship") || t.includes("dating")
  ) return "Lifestyle";

  // Entertainment (general)
  if (
    t.includes("entertainment") || t.includes("award") ||
    t.includes("tv show") || t.includes("reality") ||
    t.includes("comedian") || t.includes("drama")
  ) return "Entertainment";

  // AI
  if (
    t.includes("artificial intelligence") || t.includes("chatgpt") ||
    t.includes("openai") || t.includes("machine learning") ||
    t.includes("deep learning") || t.includes("llm") ||
    t.includes("generative ai") || t.includes("ai model")
  ) return "AI";

  // Technology
  if (
    t.includes("technology") || t.includes("iphone") ||
    t.includes("android") || t.includes("google") ||
    t.includes("apple") || t.includes("microsoft") ||
    t.includes("startup") || t.includes("elon musk") ||
    t.includes("silicon valley") || t.includes("crypto") ||
    t.includes("blockchain") || t.includes("software") ||
    t.includes("app") || t.includes("gadget") ||
    t.includes("smartphone") || t.includes("laptop")
  ) return "Technology";

  // Science
  if (
    t.includes("nasa") || t.includes("space") ||
    t.includes("galaxy") || t.includes("planet") ||
    t.includes("climate") || t.includes("environment") ||
    t.includes("scientist") || t.includes("research") ||
    t.includes("discovery") || t.includes("physics") ||
    t.includes("quantum") || t.includes("biology")
  ) return "Science";

  // Health
  if (
    t.includes("health") || t.includes("disease") ||
    t.includes("cancer") || t.includes("vaccine") ||
    t.includes("hospital") || t.includes("doctor") ||
    t.includes("medicine") || t.includes("virus") ||
    t.includes("pandemic") || t.includes("mental health") ||
    t.includes("diet") || t.includes("exercise") ||
    t.includes("diabetes") || t.includes("obesity")
  ) return "Health";

  // Wellness
  if (
    t.includes("wellness") || t.includes("meditation") ||
    t.includes("yoga") || t.includes("fitness") ||
    t.includes("nutrition") || t.includes("self care")
  ) return "Wellness";

  // Markets
  if (
    t.includes("stock") || t.includes("shares") ||
    t.includes("nasdaq") || t.includes("nyse") ||
    t.includes("market") || t.includes("investor") ||
    t.includes("trading") || t.includes("ipo")
  ) return "Markets";

  // Economy
  if (
    t.includes("economy") || t.includes("gdp") ||
    t.includes("inflation") || t.includes("recession") ||
    t.includes("unemployment") || t.includes("interest rate") ||
    t.includes("federal reserve") || t.includes("cbn")
  ) return "Economy";

  // Finance
  if (
    t.includes("finance") || t.includes("naira") ||
    t.includes("dollar") || t.includes("budget") ||
    t.includes("revenue") || t.includes("tax") ||
    t.includes("bank") || t.includes("loan") ||
    t.includes("investment") || t.includes("profit") ||
    t.includes("billion") || t.includes("million")
  ) return "Finance";

  // Journals
  if (
    t.includes("journal") || t.includes("study") ||
    t.includes("academic") || t.includes("university") ||
    t.includes("publication") || t.includes("peer review")
  ) return "Journals";

  // International
  if (
    t.includes("international") || t.includes("global") ||
    t.includes("world") || t.includes("foreign") ||
    t.includes("united nations") || t.includes("china") ||
    t.includes("russia") || t.includes("ukraine") ||
    t.includes("europe") || t.includes("middle east") ||
    t.includes("africa") || t.includes("asia") ||
    t.includes("america") || t.includes("israel") ||
    t.includes("iran") || t.includes("uk") ||
    t.includes("france") || t.includes("germany")
  ) return "International";

  // Article
  if (
    t.includes("analysis") || t.includes("opinion") ||
    t.includes("editorial") || t.includes("feature") ||
    t.includes("review") || t.includes("explained") ||
    t.includes("column") || t.includes("commentary")
  ) return "Article";

  return "News";
}

module.exports = { detectCategory };

function isBreakingNews(post) {
  const keywords = [
    "just in",
    "breaking",
    "explosion",
    "attack",
    "election",
    "president",
    "war",
    "crash"
  ];

  const text = (post.title + " " + post.content).toLowerCase();

  return keywords.some(k => text.includes(k));
}

function getBreakingNews(posts) {
  return posts.filter(isBreakingNews).slice(0, 5);
}

module.exports = { getBreakingNews };
const admin = require("./firebase");

const sendPushNotification = async (tokens, post) => {
  if (!tokens || tokens.length === 0) return;

  const message = {
    notification: {
      title: "📰 New Post Published",
      body: post.title,
    },
    data: {
      slug: post.slug,
      id: post._id.toString()
    },
    tokens: tokens
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log("Notifications sent:", response.successCount);
  } catch (err) {
    console.error("Push error:", err.message);
  }
};

module.exports = sendPushNotification;
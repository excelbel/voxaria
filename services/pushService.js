const admin = require("firebase-admin");

async function sendPushNotification(tokens, post) {
  if (!tokens || tokens.length === 0) return;

  const message = {
    notification: {
      title: post.title,
      body: post.aiSummary || post.content.substring(0, 100)
    },
    data: {
      slug: post.slug || "",
      id: post._id.toString()
    },
    tokens: tokens
  };

  try {
    const response = await admin.messaging().sendEachForMulticast({
      tokens: message.tokens,
      notification: message.notification,
      data: message.data
    });

    console.log("Push sent:", response.successCount, "failed:", response.failureCount);
  } catch (err) {
    console.log("Push error:", err.message);
  }
}

module.exports = sendPushNotification;
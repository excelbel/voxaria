const admin = require("firebase-admin");

/* =========================
   INIT SAFETY CHECK
========================= */
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  } catch (err) {
    console.log("Firebase init error:", err.message);
  }
}

/* =========================
   SEND PUSH NOTIFICATION
========================= */
async function sendPushNotification(tokens = [], post = {}) {
  if (!Array.isArray(tokens) || tokens.length === 0) return;

  const message = {
    tokens,

    notification: {
      title: post.title || "📰 New Update",
      body:
        post.aiSummary ||
        (post.content ? post.content.slice(0, 100) : "New article available")
    },

    data: {
      id: post._id ? post._id.toString() : "",
      slug: post.slug || ""
    }
  };

  try {
    const response = await admin
      .messaging()
      .sendEachForMulticast(message);

    console.log(
      "Push sent:",
      response.successCount,
      "failed:",
      response.failureCount
    );

    return response;
  } catch (err) {
    console.log("Push error:", err.message);
  }
}

module.exports = {
  sendPushNotification
};
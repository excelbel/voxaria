const admin = require("firebase-admin");

/* =========================
   LOAD SERVICE ACCOUNT
========================= */
function loadServiceAccount() {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log("Firebase env missing");
      return null;
    }

    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    console.log("Firebase JSON parse error:", err.message);
    return null;
  }
}

const serviceAccount = loadServiceAccount();

/* =========================
   INITIALIZE FIREBASE
========================= */
if (!admin.apps.length) {
  if (!serviceAccount) {
    console.log("Firebase NOT initialized (missing service account)");
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key
            ? serviceAccount.private_key.replace(/\\n/g, "\n")
            : undefined
        })
      });

      console.log("Firebase initialized successfully");
    } catch (err) {
      console.log("Firebase init failed:", err.message);
    }
  }
}

module.exports = admin;
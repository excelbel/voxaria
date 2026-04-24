const admin = require("firebase-admin");

let serviceAccount;

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (err) {
  console.error("Invalid Firebase service account JSON");
  serviceAccount = null;
}

if (!admin.apps.length && serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key
        ? serviceAccount.private_key.replace(/\\n/g, "\n")
        : undefined
    })
  });
}

module.exports = admin;
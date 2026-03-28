const admin = require("firebase-admin");

let firebaseApp;

const initializeFirebase = () => {
  try {
    let serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!serviceAccountJson) {
      console.warn(
        "⚠️  FIREBASE_SERVICE_ACCOUNT not configured. Push notifications disabled.",
      );
      return null;
    }

    // Debug: log the first 200 chars and length
    console.log(
      `📋 Firebase env var length: ${serviceAccountJson.length}, first 100 chars: ${serviceAccountJson.substring(0, 100)}`,
    );

    // Replace actual newlines/carriage returns with escaped versions
    let cleanedJson = serviceAccountJson
      .split("\n")
      .map((line) => line.trim())
      .join("")
      .trim();

    // Now parse the cleaned JSON
    const serviceAccount = JSON.parse(cleanedJson);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("✅ Firebase Admin SDK initialized successfully");
    return firebaseApp;
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error.message);
    return null;
  }
};

const getMessagingInstance = () => {
  if (!firebaseApp) {
    console.warn("⚠️  Firebase not initialized");
    return null;
  }
  return admin.messaging();
};

module.exports = {
  initializeFirebase,
  getMessagingInstance,
};

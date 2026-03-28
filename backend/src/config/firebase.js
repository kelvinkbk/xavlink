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

    // Fix newlines in the private_key field specifically
    // The private_key value contains actual newlines that need to be escaped
    serviceAccountJson = serviceAccountJson.replace(
      /("private_key":\s*")([^"]*)(")/,
      (match, prefix, keyContent, suffix) => {
        // Escape any unescaped newlines within the private key
        const fixed = keyContent.replace(/\n/g, "\\n").replace(/\r/g, "");
        return prefix + fixed + suffix;
      },
    );

    const serviceAccount = JSON.parse(serviceAccountJson);

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

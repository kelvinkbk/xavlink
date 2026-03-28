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
      /("private_key":\s*")([^"]*)(")/s,
      (match, prefix, keyContent, suffix) => {
        // Debug: show what we're working with
        console.log(
          `🔑 Private key before fix - length: ${keyContent.length}, has newlines: ${keyContent.includes("\n")}`,
        );
        // Escape any unescaped newlines within the private key
        const fixed = keyContent.replace(/\n/g, "\\n").replace(/\r/g, "");
        console.log(
          `🔑 Private key after fix - length: ${fixed.length}, first 50 chars: ${fixed.substring(0, 50)}`,
        );
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

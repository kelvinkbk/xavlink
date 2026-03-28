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

    // Parse JSON first
    let serviceAccount = JSON.parse(serviceAccountJson);

    // The private_key field contains escaped \\n sequences that need to be converted to actual newlines
    if (
      serviceAccount.private_key &&
      typeof serviceAccount.private_key === "string"
    ) {
      console.log(
        `🔑 Before: private_key contains literal \\n: ${serviceAccount.private_key.includes("\\n")}`,
      );
      console.log(
        `🔑 Before: key length=${serviceAccount.private_key.length}, starts with: ${serviceAccount.private_key.substring(0, 50)}`,
      );
      console.log(
        `🔑 Before: key ends with: ${serviceAccount.private_key.substring(serviceAccount.private_key.length - 50)}`,
      );

      // Replace escaped newlines with actual newlines
      serviceAccount.private_key = serviceAccount.private_key.replace(
        /\\n/g,
        "\n",
      );
      console.log(
        `🔑 After: private_key contains actual newlines: ${serviceAccount.private_key.includes("\n")}`,
      );
      console.log(
        `🔑 After: key length=${serviceAccount.private_key.length}, line count: ${serviceAccount.private_key.split("\n").length}`,
      );
    }

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

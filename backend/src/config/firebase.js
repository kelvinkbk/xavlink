const admin = require("firebase-admin");

let firebaseApp;
let firebaseInitialized = false;

const initializeFirebase = () => {
  try {
    let serviceAccount;

    // Try method 1: Full JSON in FIREBASE_SERVICE_ACCOUNT
    const fullJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (fullJson) {
      serviceAccount = JSON.parse(fullJson);
    }

    // Try method 2: Individual environment variables
    if (
      !serviceAccount &&
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL
    ) {
      console.log("📋 Using individual Firebase environment variables...");
      serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "key-id",
        private_key: process.env.FIREBASE_PRIVATE_KEY,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID || "client-id",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:
          "https://www.googleapis.com/oauth2/v1/certs",
        universe_domain: "googleapis.com",
      };
    }

    if (!serviceAccount) {
      console.warn(
        "⚠️  No Firebase credentials configured. Push notifications disabled.",
      );
      console.warn(
        "💡 Set either FIREBASE_SERVICE_ACCOUNT (full JSON) or FIREBASE_PRIVATE_KEY + FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL",
      );
      return null;
    }

    // Fix the private key if it has escaped newlines
    if (
      serviceAccount.private_key &&
      typeof serviceAccount.private_key === "string"
    ) {
      // Replace escaped newlines with actual newlines
      serviceAccount.private_key = serviceAccount.private_key.replace(
        /\\n/g,
        "\n",
      );

      // Clean up the key: split and filter out empty lines
      let lines = serviceAccount.private_key
        .split("\n")
        .filter((line) => line.length > 0);

      // Reconstruct without trailing empty lines
      serviceAccount.private_key = lines.join("\n");

      console.log(`✅ Firebase private key formatted (${lines.length} lines)`);
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    firebaseInitialized = true;
    console.log("✅ Firebase Admin SDK initialized successfully");
    return firebaseApp;
  } catch (error) {
    // Firebase is optional - log the error but don't fail the app
    console.warn(
      "⚠️  Firebase initialization skipped:",
      error.message.substring(0, 100),
    );
    console.warn(
      "💡 Tip: Check your Firebase credentials in environment variables",
    );
    return null;
  }
};

const getMessagingInstance = () => {
  if (!firebaseInitialized || !firebaseApp) {
    return null;
  }
  return admin.messaging();
};

module.exports = {
  initializeFirebase,
  getMessagingInstance,
};

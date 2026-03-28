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
      // Replace escaped newlines with actual newlines
      serviceAccount.private_key = serviceAccount.private_key.replace(
        /\\n/g,
        "\n",
      );

      // Debug: inspect the key structure
      const lines = serviceAccount.private_key.split("\n");
      console.log(
        `🔑 Key structure: ${lines.length} lines, total length: ${serviceAccount.private_key.length}`,
      );
      console.log(`🔑 First line: ${lines[0]}`);
      console.log(`🔑 Last line: ${lines[lines.length - 1]}`);

      // Clean the key: remove any whitespace issues but preserve the PEM structure
      const header = lines[0]; // -----BEGIN PRIVATE KEY-----
      const footer = lines[lines.length - 1]; // -----END PRIVATE KEY-----
      const body = lines.slice(1, -1); // All the base64 content

      // Reconstruct the key with clean newlines
      serviceAccount.private_key = [header, ...body, footer].join("\n");

      console.log(
        `🔑 Reconstructed key length: ${serviceAccount.private_key.length}`,
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

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

      // Clean up the key: split and filter out empty lines from splitting
      let lines = serviceAccount.private_key
        .split("\n")
        .filter((line) => line.length > 0);

      console.log(`🔑 Key structure: ${lines.length} content lines (filtered)`);
      console.log(`🔑 First line: ${lines[0]}`);
      console.log(`🔑 Last line: ${lines[lines.length - 1]}`);

      // Log sample base64 lines to check for corruption
      if (lines.length > 2) {
        console.log(`🔑 Line 2 (sample): ${lines[1]}`);
        console.log(
          `🔑 Line 2 length: ${lines[1].length}, has non-base64: ${!/^[A-Za-z0-9+/=]*$/.test(lines[1])}`,
        );
      }

      // Reconstruct without trailing empty lines
      serviceAccount.private_key = lines.join("\n");

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

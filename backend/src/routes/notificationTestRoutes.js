const express = require("express");
const { sendPushNotification } = require("../utils/pushNotificationService");
const authMiddleware = require("../middleware/authMiddleware");
const prisma = require("../config/prismaClient");

const router = express.Router();

/**
 * Test endpoint to send a notification to the current user
 * POST /api/notifications/test
 * Requires authentication
 */
router.post("/test", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title = "Test Notification",
      body = "This is a test notification from XavLink",
    } = req.body;

    console.log(`🧪 Sending test notification to user ${userId}`);

    const success = await sendPushNotification(userId, title, body, {
      type: "test",
      timestamp: new Date().toISOString(),
    });

    if (success) {
      return res.status(200).json({
        success: true,
        message: "✅ Test notification sent successfully",
        userId,
      });
    } else {
      return res.status(400).json({
        success: false,
        message:
          "❌ Failed to send notification - no valid device tokens found",
        userId,
      });
    }
  } catch (error) {
    console.error("Error sending test notification:", error);
    res.status(500).json({
      success: false,
      message: "Error sending test notification",
      error: error.message,
    });
  }
});

/**
 * Diagnostics endpoint - check notification setup
 * GET /api/notifications/test/diagnostics
 */
router.get("/diagnostics", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user data with tokens
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        deviceTokens: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    // Get Firebase status
    const { getMessagingInstance } = require("../config/firebase");
    const messaging = getMessagingInstance();

    return res.status(200).json({
      diagnostics: {
        userId: user.id,
        email: user.email,
        deviceTokens: {
          count: user.deviceTokens ? user.deviceTokens.length : 0,
          tokens: user.deviceTokens
            ? user.deviceTokens.map((token) => ({
                value: token.substring(0, 30) + "...",
                length: token.length,
                type: token.includes("Expo")
                  ? "Expo"
                  : token.includes(":")
                    ? "FCM"
                    : "Unknown",
              }))
            : [],
          hasTokens: user.deviceTokens && user.deviceTokens.length > 0,
        },
        firebase: {
          status: messaging ? "✅ Configured" : "❌ Not configured",
          messaging: !!messaging,
        },
        webPush: {
          vapidKey: !!process.env.VAPID_PUBLIC_KEY,
          status: process.env.VAPID_PUBLIC_KEY
            ? "✅ Configured"
            : "❌ Not configured",
        },
        troubleshooting: {
          recommendations: [
            user.deviceTokens && user.deviceTokens.length > 0
              ? `✅ You have ${user.deviceTokens.length} device token(s) registered`
              : "❌ No device tokens registered. Make sure your app is connected and has sent its token to the backend.",
            messaging
              ? "✅ Firebase is initialized. Push notifications ready."
              : "⚠️  Firebase is not initialized. Mobile push notifications won't work.",
            process.env.VAPID_PUBLIC_KEY
              ? "✅ Web Push is configured."
              : "⚠️  Web Push VAPID key not configured.",
          ],
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error checking diagnostics",
      error: error.message,
    });
  }
});

/**
 * Health check endpoint for Firebase notifications
 * GET /api/notifications/status
 */
router.get("/status", (req, res) => {
  try {
    const { getMessagingInstance } = require("../config/firebase");
    const messaging = getMessagingInstance();

    if (messaging) {
      return res.status(200).json({
        status: "✅ Firebase messaging is configured and ready",
        messaging: true,
      });
    } else {
      return res.status(200).json({
        status: "⚠️  Firebase messaging is not available",
        messaging: false,
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "❌ Error checking Firebase status",
      error: error.message,
    });
  }
});

module.exports = router;

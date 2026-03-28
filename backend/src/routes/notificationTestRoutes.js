const express = require("express");
const { sendPushNotification } = require("../utils/pushNotificationService");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * Test endpoint to send a notification to the current user
 * POST /api/notifications/test
 * Requires authentication
 */
router.post("/test", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title = "Test Notification", body = "This is a test notification from XavLink" } = req.body;

    console.log(`🧪 Sending test notification to user ${userId}`);

    const success = await sendPushNotification(
      userId,
      title,
      body,
      { type: "test", timestamp: new Date().toISOString() }
    );

    if (success) {
      return res.status(200).json({
        success: true,
        message: "✅ Test notification sent successfully",
        userId,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "❌ Failed to send notification - no valid device tokens found",
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

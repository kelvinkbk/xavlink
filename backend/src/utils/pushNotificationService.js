const { getMessagingInstance } = require("../config/firebase");
const prisma = require("../config/prismaClient");

/**
 * Send push notification to a specific user
 * @param {string} userId - Recipient user ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data to send
 */
const sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    const messaging = getMessagingInstance();

    if (!messaging) {
      console.warn("⚠️  Firebase messaging not available");
      return false;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { deviceTokens: true },
    });

    if (!user?.deviceTokens || user.deviceTokens.length === 0) {
      console.log(`No device tokens found for user ${userId}`);
      return false;
    }

    const validTokens = user.deviceTokens.filter(
      (token) => token && token.trim(),
    );

    if (validTokens.length === 0) {
      console.log(`No valid device tokens for user ${userId}`);
      return false;
    }

    const response = await messaging.sendMulticast({
      tokens: validTokens,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        receivedAt: new Date().toISOString(),
      },
      android: {
        priority: "high",
        ttl: 7 * 24 * 60 * 60, // 7 days
        notification: {
          sound: "default",
          channelId: "xavlink_notifications",
        },
      },
    });

    console.log(
      `✅ Push notification sent to user ${userId}: ${response.successCount} succeeded, ${response.failureCount} failed`,
    );

    // Remove failed tokens
    if (response.failureCount > 0) {
      const failedTokenIndices = response.responses
        .map((resp, idx) => (!resp.success ? idx : -1))
        .filter((idx) => idx !== -1);

      const tokensToRemove = failedTokenIndices.map((idx) => validTokens[idx]);

      if (tokensToRemove.length > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            deviceTokens: {
              set: validTokens.filter(
                (token) => !tokensToRemove.includes(token),
              ),
            },
          },
        });
        console.log(
          `🗑️  Removed ${tokensToRemove.length} invalid tokens for user ${userId}`,
        );
      }
    }

    return response.successCount > 0;
  } catch (error) {
    console.error("❌ Failed to send push notification:", error);
    return false;
  }
};

/**
 * Send push notification to multiple users
 * @param {string[]} userIds - Array of recipient user IDs
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data to send
 */
const sendBulkPushNotification = async (userIds, title, body, data = {}) => {
  try {
    const results = await Promise.allSettled(
      userIds.map((userId) => sendPushNotification(userId, title, body, data)),
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value,
    ).length;
    console.log(
      `📤 Bulk push notification: ${successful}/${userIds.length} users notified`,
    );

    return successful;
  } catch (error) {
    console.error("❌ Bulk push notification failed:", error);
    return 0;
  }
};

module.exports = {
  sendPushNotification,
  sendBulkPushNotification,
};

/**
 * Expo Push Notification Service
 * Handles sending push notifications to mobile devices via Expo
 */

const fetch = require("node-fetch");
const prisma = require("../config/prismaClient");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Get all device tokens for a user
 */
const getUserDeviceTokens = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { deviceTokens: true },
    });
    return user?.deviceTokens || [];
  } catch (error) {
    console.error("Error fetching device tokens:", error);
    return [];
  }
};

/**
 * Save device token for a user
 */
exports.saveDeviceToken = async (userId, token) => {
  try {
    // Check if token is valid Expo push token format
    if (
      !token.startsWith("ExponentPushToken[") &&
      !token.startsWith("ExponentPushToken[") === false
    ) {
      console.warn(`⚠️ Invalid token format: ${token}`);
      return false;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { deviceTokens: true },
    });

    const tokens = user?.deviceTokens || [];

    // Avoid duplicates
    if (!tokens.includes(token)) {
      tokens.push(token);
      await prisma.user.update({
        where: { id: userId },
        data: { deviceTokens: tokens },
      });
      console.log(`📱 Device token saved for user ${userId}`);
    }

    return true;
  } catch (error) {
    console.error("Error saving device token:", error);
    return false;
  }
};

/**
 * Remove device token for a user (e.g., when user logs out)
 */
exports.removeDeviceToken = async (userId, token) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { deviceTokens: true },
    });

    const tokens = (user?.deviceTokens || []).filter((t) => t !== token);

    await prisma.user.update({
      where: { id: userId },
      data: { deviceTokens: tokens },
    });

    console.log(`🗑️ Device token removed for user ${userId}`);
    return true;
  } catch (error) {
    console.error("Error removing device token:", error);
    return false;
  }
};

/**
 * Send push notification to a user
 */
exports.sendPushNotification = async ({
  userId,
  title,
  body,
  data = {},
  badge = 1,
}) => {
  try {
    const tokens = await getUserDeviceTokens(userId);

    if (tokens.length === 0) {
      console.warn(`⚠️ No device tokens for user ${userId}`);
      return { success: false, error: "No device tokens" };
    }

    const messages = tokens.map((to) => ({
      to,
      sound: "default",
      title,
      body,
      data,
      badge,
      ttl: 86400, // 24 hours
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    if (result.errors) {
      console.error("❌ Expo push errors:", result.errors);
      // Remove invalid tokens
      for (const error of result.errors) {
        if (error.code === "DeviceNotRegistered") {
          await exports.removeDeviceToken(userId, error.details?.deviceId);
        }
      }
    }

    console.log(
      `📤 Push notification sent to user ${userId}: "${title}" - "${body}"`,
    );
    return { success: true, result };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Send push for new message
 */
exports.sendMessagePushNotification = async ({
  userId,
  senderName,
  messagePreview,
  chatId,
}) => {
  return exports.sendPushNotification({
    userId,
    title: `New message from ${senderName}`,
    body: messagePreview || "You have a new message",
    data: {
      type: "message",
      chatId,
      action: "open_chat",
    },
  });
};

/**
 * Send push for new notification (like, comment, follow)
 */
exports.sendNotificationPush = async ({
  userId,
  type,
  title,
  message,
  relatedId,
  actionUrl,
}) => {
  return exports.sendPushNotification({
    userId,
    title,
    body: message,
    data: {
      type,
      relatedId,
      actionUrl,
    },
  });
};

/**
 * Send batch push notifications
 */
exports.sendBatchPushNotifications = async (notifications) => {
  const results = [];

  for (const notification of notifications) {
    const result = await exports.sendPushNotification(notification);
    results.push(result);
  }

  return results;
};

/**
 * Bulk send to multiple users
 */
exports.sendPushToUsers = async (userIds, { title, body, data = {} }) => {
  const results = [];

  for (const userId of userIds) {
    const result = await exports.sendPushNotification({
      userId,
      title,
      body,
      data,
    });
    results.push({ userId, ...result });
  }

  return results;
};

module.exports = exports;

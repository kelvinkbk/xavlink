/**
 * Web Push Notification Service
 * Handles sending push notifications to web browsers
 */

const webpush = require("web-push");
const prisma = require("../config/prismaClient");

// Configure web push (should be set from environment)
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:example@example.com";

if (vapidPrivateKey && vapidPublicKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  console.log("✅ Web Push configured");
} else {
  console.warn(
    "⚠️ Web Push not configured - Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY",
  );
}

/**
 * Save web push subscription for a user
 */
exports.saveWebPushSubscription = async (userId, subscription) => {
  try {
    if (!subscription || !subscription.endpoint) {
      return false;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { webPushSubscriptions: true },
    });

    let subscriptions = user?.webPushSubscriptions || [];

    // Remove old subscription with same endpoint if exists
    subscriptions = subscriptions.filter(
      (s) => s.endpoint !== subscription.endpoint,
    );

    // Add new subscription
    subscriptions.push(subscription);

    // Keep only last 5 subscriptions (multiple devices)
    if (subscriptions.length > 5) {
      subscriptions = subscriptions.slice(-5);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { webPushSubscriptions: subscriptions },
    });

    console.log(`🖥️ Web push subscription saved for user ${userId}`);
    return true;
  } catch (error) {
    console.error("Error saving web push subscription:", error);
    return false;
  }
};

/**
 * Send web push notification to a user
 */
exports.sendWebPushNotification = async ({
  userId,
  title,
  body,
  icon = "/icon-192.png",
  badge = "/badge-72.png",
  tag = "notification",
  data = {},
}) => {
  try {
    if (!vapidPrivateKey || !vapidPublicKey) {
      console.warn("⚠️ Web Push not configured");
      return { success: false, error: "Web Push not configured" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { webPushSubscriptions: true },
    });

    if (!user?.webPushSubscriptions || user.webPushSubscriptions.length === 0) {
      console.warn(`⚠️ No web push subscriptions for user ${userId}`);
      return { success: false, error: "No subscriptions" };
    }

    const notificationPayload = {
      title,
      body,
      icon,
      badge,
      tag,
      data,
      requireInteraction: false,
    };

    let successCount = 0;
    let failedSubscriptions = [];

    for (const subscription of user.webPushSubscriptions) {
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify(notificationPayload),
        );
        successCount++;
      } catch (error) {
        console.error("Error sending web push:", error.message);

        // Remove subscription if it's invalid
        if (error.statusCode === 410 || error.statusCode === 404) {
          failedSubscriptions.push(subscription.endpoint);
        }
      }
    }

    // Remove invalid subscriptions
    if (failedSubscriptions.length > 0) {
      const updatedSubscriptions = user.webPushSubscriptions.filter(
        (s) => !failedSubscriptions.includes(s.endpoint),
      );

      await prisma.user.update({
        where: { id: userId },
        data: { webPushSubscriptions: updatedSubscriptions },
      });
    }

    console.log(
      `🖥️ Web push sent to user ${userId}: "${title}" (${successCount}/${user.webPushSubscriptions.length})`,
    );

    return {
      success: successCount > 0,
      successCount,
      totalCount: user.webPushSubscriptions.length,
    };
  } catch (error) {
    console.error("Error sending web push notification:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Send batch web push notifications
 */
exports.sendBatchWebPushes = async (notifications) => {
  const results = [];

  for (const notification of notifications) {
    const result = await exports.sendWebPushNotification(notification);
    results.push(result);
  }

  return results;
};

/**
 * Bulk send to multiple users
 */
exports.sendWebPushToUsers = async (
  userIds,
  { title, body, icon, badge, data = {} },
) => {
  const results = [];

  for (const userId of userIds) {
    const result = await exports.sendWebPushNotification({
      userId,
      title,
      body,
      icon,
      badge,
      data,
    });
    results.push({ userId, ...result });
  }

  return results;
};

module.exports = exports;

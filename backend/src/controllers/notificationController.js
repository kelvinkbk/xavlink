const prisma = require("../config/prismaClient");

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ notifications });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch notifications", error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    res.json(notification);
  } catch (error) {
    res.status(500).json({
      message: "Failed to mark notification as read",
      error: error.message,
    });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    res.json({
      message: "All notifications marked as read",
      updatedCount: result.count,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to mark notifications as read",
      error: error.message,
    });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.delete({
      where: { id },
    });
    res.json({ message: "Notification deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete notification", error: error.message });
  }
};
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const count = await prisma.notification.count({
      where: { userId, read: false },
    });
    res.json({ unreadCount: count });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch unread count", error: error.message });
  }
};

// Helper function to create notifications and emit socket event
exports.createNotification = async ({
  userId,
  type,
  title,
  message,
  relatedId = null,
} = {}) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        relatedId,
      },
    });

    // Emit real-time notification via socket.io
    if (global.io) {
      global.io.to(`user:${userId}`).emit("new_notification", notification);
    }

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
};

// Save web push subscription
exports.savePushSubscription = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { subscription } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: "Invalid subscription" });
    }

    const { saveWebPushSubscription } = require("../services/webPushService");
    const success = await saveWebPushSubscription(userId, subscription);

    if (success) {
      res.json({ message: "Subscription saved", success: true });
    } else {
      res.status(500).json({ error: "Failed to save subscription" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Failed to save push subscription",
      error: error.message,
    });
  }
};

// Get VAPID public key for web push
exports.getVapidPublicKey = async (req, res) => {
  try {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;

    if (!vapidPublicKey) {
      return res.status(500).json({
        error: "Web Push not configured",
      });
    }

    res.json({ vapidPublicKey });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get VAPID key",
      error: error.message,
    });
  }
};

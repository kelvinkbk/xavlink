const prisma = require("../config/prismaClient");

exports.getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(notifications);
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
    const { userId } = req.params;
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    res.json({ message: "All notifications marked as read" });
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
    const { userId } = req.params;
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

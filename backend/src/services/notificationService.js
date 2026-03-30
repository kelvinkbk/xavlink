const prisma = require("../config/prismaClient");
const {
  sendNotificationPush,
  sendMessagePushNotification,
} = require("./expoPushService");
const { sendWebPushNotification } = require("./webPushService");

/**
 * Create and emit a real-time notification
 * @param {Object} params - Notification parameters
 * @param {string} params.userId - Recipient user ID
 * @param {string} params.type - Notification type
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} params.relatedId - Related resource ID (post, user, comment, etc)
 * @param {string} params.actionUrl - URL for action
 * @param {Object} params.io - Socket.io instance for real-time emission
 * @returns {Promise<Object>} Created notification
 */
exports.createNotification = async ({
  userId,
  type,
  title,
  message,
  relatedId = null,
  actionUrl = null,
  io = null,
}) => {
  try {
    // Check user notification preferences
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    // Map notification types to preference settings
    const preferenceMap = {
      post_liked: "likeNotifications",
      post_commented: "commentNotifications",
      follow: "followNotifications",
      message_received: "messageNotifications",
      request_received: "requestNotifications",
      request_accepted: "requestNotifications",
      request_rejected: "requestNotifications",
      login_alert: "activityNotifications",
    };

    const preferenceKey = preferenceMap[type];
    if (userSettings && preferenceKey && !userSettings[preferenceKey]) {
      console.log(`📵 Notifications disabled for user ${userId} type ${type}`);
      return null;
    }

    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        relatedId,
        actionUrl,
      },
    });

    // Emit real-time Socket.io event to user
    if (io) {
      io.to(`user:${userId}`).emit("new_notification", {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        relatedId: notification.relatedId,
        actionUrl: notification.actionUrl,
        createdAt: notification.createdAt,
        read: notification.read,
      });

      // Also emit unread count update
      const unreadCount = await prisma.notification.count({
        where: { userId, read: false },
      });
      io.to(`user:${userId}`).emit("notification:unread-count", {
        unreadCount,
      });
    }

    // Send push notification (async - don't await to avoid delays)
    sendNotificationPush({
      userId,
      type,
      title,
      message,
      relatedId,
      actionUrl,
    }).catch((err) => {
      console.error("Error sending mobile push notification:", err);
    });

    // Send web push notification
    sendWebPushNotification({
      userId,
      title,
      body: message,
      data: {
        type,
        relatedId,
        actionUrl,
      },
    }).catch((err) => {
      console.error("Error sending web push notification:", err);
    });

    console.log(`✉️ Notification created for user ${userId}: ${type}`);
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
};

/**
 * Create follow notification
 */
exports.notifyFollow = async ({ followerId, followingId, io }) => {
  const follower = await prisma.user.findUnique({
    where: { id: followerId },
    select: { name: true },
  });

  return exports.createNotification({
    userId: followingId,
    type: "follow",
    title: "New Follower",
    message: `${follower.name} started following you`,
    relatedId: followerId,
    actionUrl: `/profile/${followerId}`,
    io,
  });
};

/**
 * Create post like notification
 */
exports.notifyPostLike = async ({ postId, likerId, io }) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true, title: true },
  });

  if (!post) return null;

  const liker = await prisma.user.findUnique({
    where: { id: likerId },
    select: { name: true },
  });

  // Don't notify if liker is the post author
  if (post.authorId === likerId) return null;

  return exports.createNotification({
    userId: post.authorId,
    type: "post_liked",
    title: "Post Liked",
    message: `${liker.name} liked your post: "${post.title}"`,
    relatedId: postId,
    actionUrl: `/post/${postId}`,
    io,
  });
};

/**
 * Create post comment notification
 */
exports.notifyPostComment = async ({ postId, commenterId, io }) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true, title: true },
  });

  if (!post) return null;

  const commenter = await prisma.user.findUnique({
    where: { id: commenterId },
    select: { name: true },
  });

  // Don't notify if commenter is the post author
  if (post.authorId === commenterId) return null;

  return exports.createNotification({
    userId: post.authorId,
    type: "post_commented",
    title: "New Comment",
    message: `${commenter.name} commented on your post: "${post.title}"`,
    relatedId: postId,
    actionUrl: `/post/${postId}`,
    io,
  });
};

/**
 * Create message notification
 */
exports.notifyMessage = async ({
  chatId,
  senderId,
  senderName,
  messagePreview,
  io,
}) => {
  // Get all participants in the chat
  const participants = await prisma.chatParticipant.findMany({
    where: { chatId },
    select: { userId: true },
  });

  for (const participant of participants) {
    // Don't notify the sender
    if (participant.userId === senderId) continue;

    // Create in-app notification
    await exports.createNotification({
      userId: participant.userId,
      type: "message_received",
      title: "New Message",
      message: `${senderName} sent you a message`,
      relatedId: chatId,
      actionUrl: `/chat/${chatId}`,
      io,
    });

    // Send mobile push notification with message preview
    sendMessagePushNotification({
      userId: participant.userId,
      senderName,
      messagePreview: messagePreview || "You have a new message",
      chatId,
    }).catch((err) => {
      console.error("Error sending message mobile push:", err);
    });

    // Send web push notification
    sendWebPushNotification({
      userId: participant.userId,
      title: `Message from ${senderName}`,
      body: messagePreview || "You have a new message",
      data: {
        type: "message",
        chatId,
        action: "open_chat",
      },
    }).catch((err) => {
      console.error("Error sending message web push:", err);
    });
  }
};

/**
 * Create request notification
 */
exports.notifyRequest = async ({
  requestId,
  requestType,
  senderId,
  recipientId,
  io,
}) => {
  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { name: true },
  });

  return exports.createNotification({
    userId: recipientId,
    type: "request_received",
    title: `New ${requestType} Request`,
    message: `${sender.name} sent you a ${requestType} request`,
    relatedId: requestId,
    actionUrl: `/requests`,
    io,
  });
};

/**
 * Notify request acceptance
 */
exports.notifyRequestAccepted = async ({
  requestId,
  accepterId,
  senderId,
  io,
}) => {
  const accepter = await prisma.user.findUnique({
    where: { id: accepterId },
    select: { name: true },
  });

  return exports.createNotification({
    userId: senderId,
    type: "request_accepted",
    title: "Request Accepted",
    message: `${accepter.name} accepted your request`,
    relatedId: requestId,
    actionUrl: `/profile/${accepterId}`,
    io,
  });
};

/**
 * Notify request rejection
 */
exports.notifyRequestRejected = async ({
  requestId,
  rejectedById,
  senderId,
  io,
}) => {
  const rejectedBy = await prisma.user.findUnique({
    where: { id: rejectedById },
    select: { name: true },
  });

  return exports.createNotification({
    userId: senderId,
    type: "request_rejected",
    title: "Request Rejected",
    message: `${rejectedBy.name} rejected your request`,
    relatedId: requestId,
    actionUrl: `/requests`,
    io,
  });
};

/**
 * Notify followers about new post
 */
exports.notifyNewPost = async ({ postId, postAuthorId, postTitle, io }) => {
  try {
    const author = await prisma.user.findUnique({
      where: { id: postAuthorId },
      select: { name: true },
    });

    if (!author) return null;

    // Get all followers of this user
    const followers = await prisma.follow.findMany({
      where: { followingId: postAuthorId },
      select: { followerId: true },
    });

    // Notify each follower
    for (const follower of followers) {
      await exports.createNotification({
        userId: follower.followerId,
        type: "new_post",
        title: `New post from ${author.name}`,
        message: postTitle ? postTitle.substring(0, 100) : `${author.name} posted something`,
        relatedId: postId,
        actionUrl: `/post/${postId}`,
        io,
      });
    }

    console.log(`📢 Post notification sent to ${followers.length} followers of ${author.name}`);
    return true;
  } catch (error) {
    console.error("Error notifying post followers:", error);
    return false;
  }
};

/**
 * Batch delete old notifications (older than 30 days)
 */
exports.cleanupOldNotifications = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        read: true, // Only delete read notifications
      },
    });
    console.log(`🧹 Cleaned up ${result.count} old notifications`);
    return result;
  } catch (error) {
    console.error("Error cleaning up notifications:", error);
  }
};

/**
 * Get user's notification stats
 */
exports.getNotificationStats = async (userId) => {
  try {
    const stats = await prisma.notification.groupBy({
      by: ["type", "read"],
      where: { userId },
      _count: true,
    });

    return stats;
  } catch (error) {
    console.error("Error getting notification stats:", error);
    return [];
  }
};

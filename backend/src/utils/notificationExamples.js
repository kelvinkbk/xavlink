/**
 * Example: How to integrate push notifications into XavLink features
 * 
 * This file shows practical examples of sending push notifications
 * for common features: posts, messages, follows, likes, comments
 */

const { sendPushNotification, sendBulkPushNotification } = require('./pushNotificationService');
const prisma = require('../config/prismaClient');

// ============================================
// 1. NEW POST NOTIFICATION
// ============================================
// Notify all followers when user creates a post

const notifyNewPost = async (userId, post) => {
  try {
    // Get all followers of this user
    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    });

    const followerIds = followers.map(f => f.followerId);
    
    if (followerIds.length === 0) return;

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Send bulk notification
    await sendBulkPushNotification(
      followerIds,
      `${user.name} posted`,
      post.content.substring(0, 80) + '...',
      {
        type: 'post',
        postId: post.id,
        authorId: userId,
        authorName: user.name,
      }
    );

    console.log(`📮 New post notification sent to ${followerIds.length} followers`);
  } catch (error) {
    console.error('❌ Failed to notify new post:', error);
  }
};

// Usage in postController.js:
// After creating post:
// await notifyNewPost(userId, newPost);

// ============================================
// 2. NEW MESSAGE NOTIFICATION
// ============================================
// Notify recipient of new message

const notifyNewMessage = async (chatId, senderId, recipientId, messageText) => {
  try {
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { name: true },
    });

    await sendPushNotification(
      recipientId,
      `Message from ${sender.name}`,
      messageText.substring(0, 80),
      {
        type: 'message',
        chatId: chatId,
        senderId: senderId,
        senderName: sender.name,
      }
    );

    console.log(`💬 Message notification sent to user ${recipientId}`);
  } catch (error) {
    console.error('❌ Failed to notify new message:', error);
  }
};

// Usage in server.js Socket.IO handler:
// socket.on('send_message', async (payload, callback) => {
//   // ... create message logic ...
//   await notifyNewMessage(chatId, senderId, recipientId, message.text);
// });

// ============================================
// 3. POST LIKED NOTIFICATION
// ============================================
// Notify post author when someone likes their post

const notifyPostLiked = async (postId, likerId) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true, content: true },
    });

    const liker = await prisma.user.findUnique({
      where: { id: likerId },
      select: { name: true },
    });

    if (post.userId === likerId) return; // Don't notify self

    await sendPushNotification(
      post.userId,
      `${liker.name} liked your post`,
      post.content.substring(0, 60) + '...',
      {
        type: 'like',
        postId: postId,
        likerId: likerId,
        likerName: liker.name,
      }
    );

    console.log(`❤️ Like notification sent to post author`);
  } catch (error) {
    console.error('❌ Failed to notify post liked:', error);
  }
};

// Usage in likeController.js:
// After creating like:
// await notifyPostLiked(postId, userId);

// ============================================
// 4. NEW COMMENT NOTIFICATION
// ============================================
// Notify post author and other commenters

const notifyNewComment = async (postId, commenterId, commentText) => {
  try {
    // Get post author
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    // Get all users who commented on this post
    const comments = await prisma.comment.findMany({
      where: { postId: postId, userId: { not: commenterId } },
      select: { userId: true },
    });

    const notifyUserIds = new Set([
      post.userId,
      ...comments.map(c => c.userId),
    ]);

    const commenter = await prisma.user.findUnique({
      where: { id: commenterId },
      select: { name: true },
    });

    // Notify all relevant users
    await sendBulkPushNotification(
      Array.from(notifyUserIds),
      `${commenter.name} commented`,
      commentText.substring(0, 60) + '...',
      {
        type: 'comment',
        postId: postId,
        commenterId: commenterId,
        commenterName: commenter.name,
      }
    );

    console.log(`💬 Comment notification sent to ${notifyUserIds.size} users`);
  } catch (error) {
    console.error('❌ Failed to notify new comment:', error);
  }
};

// Usage in commentController.js:
// After creating comment:
// await notifyNewComment(postId, userId, comment.text);

// ============================================
// 5. NEW FOLLOWER NOTIFICATION
// ============================================
// Notify user when someone follows them

const notifyNewFollower = async (followerId, followingId) => {
  try {
    const follower = await prisma.user.findUnique({
      where: { id: followerId },
      select: { name: true, profilePic: true },
    });

    await sendPushNotification(
      followingId,
      `${follower.name} followed you`,
      'Check out their profile',
      {
        type: 'follow',
        followerId: followerId,
        followerName: follower.name,
        followerAvatar: follower.profilePic,
      }
    );

    console.log(`➕ Follow notification sent to user ${followingId}`);
  } catch (error) {
    console.error('❌ Failed to notify new follower:', error);
  }
};

// Usage in followController.js:
// After creating follow:
// await notifyNewFollower(userId, targetUserId);

// ============================================
// 6. SKILL ENDORSEMENT NOTIFICATION
// ============================================

const notifySkillEndorsement = async (endorserId, endorsedUserId, skillName) => {
  try {
    const endorser = await prisma.user.findUnique({
      where: { id: endorserId },
      select: { name: true },
    });

    await sendPushNotification(
      endorsedUserId,
      `${endorser.name} endorsed your skill`,
      `${skillName} skill`,
      {
        type: 'endorsement',
        endorserId: endorserId,
        endorserName: endorser.name,
        skillName: skillName,
      }
    );

    console.log(`⭐ Endorsement notification sent`);
  } catch (error) {
    console.error('❌ Failed to notify endorsement:', error);
  }
};

// ============================================
// 7. BROADCAST NOTIFICATION (Admin)
// ============================================
// Send notification to all users or specific group

const broadcastNotification = async (title, body, data = {}, userIds = null) => {
  try {
    let targetUserIds = userIds;

    // If no users specified, get all users
    if (!userIds) {
      const users = await prisma.user.findMany({
        select: { id: true },
      });
      targetUserIds = users.map(u => u.id);
    }

    const sent = await sendBulkPushNotification(
      targetUserIds,
      title,
      body,
      data
    );

    console.log(`📢 Broadcast notification sent to ${sent} users`);
    return sent;
  } catch (error) {
    console.error('❌ Failed to broadcast notification:', error);
    return 0;
  }
};

module.exports = {
  notifyNewPost,
  notifyNewMessage,
  notifyPostLiked,
  notifyNewComment,
  notifyNewFollower,
  notifySkillEndorsement,
  broadcastNotification,
};

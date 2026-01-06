const prisma = require("../config/prismaClient");
const { checkForFlaggedContent } = require("../utils/contentFilter");

/**
 * Get or create a 1-on-1 chat between two users
 */
exports.getOrCreateDirectChat = async (req, res, next) => {
  try {
    const { otherUserId } = req.body;
    const userId = req.user.id;

    if (!otherUserId) {
      return res.status(400).json({ message: "otherUserId is required" });
    }

    // Find existing chat between these two users
    const existingChat = await prisma.chat.findFirst({
      where: {
        participants: {
          every: {
            userId: { in: [userId, otherUserId] },
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profilePic: true,
              },
            },
          },
        },
        messages: {
          orderBy: { timestamp: "desc" },
          take: 1,
          include: {
            sender: {
              select: { id: true, name: true, profilePic: true },
            },
          },
        },
      },
    });

    if (existingChat && existingChat.participants.length === 2) {
      return res.json(existingChat);
    }

    // Create new chat
    const newChat = await prisma.chat.create({
      data: {
        participants: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, profilePic: true },
            },
          },
        },
        messages: true,
      },
    });

    res.status(201).json(newChat);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a group chat
 */
exports.createGroupChat = async (req, res, next) => {
  try {
    const { participantIds, name } = req.body;
    const userId = req.user.id;

    if (!participantIds || participantIds.length === 0) {
      return res.status(400).json({ message: "participantIds are required" });
    }

    // Include creator
    const allParticipants = [...new Set([userId, ...participantIds])];

    const newChat = await prisma.chat.create({
      data: {
        participants: {
          create: allParticipants.map((id) => ({ userId: id })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, profilePic: true },
            },
          },
        },
        messages: true,
      },
    });

    res.status(201).json(newChat);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all chats for the logged-in user
 */
exports.getUserChats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, profilePic: true },
            },
          },
        },
        messages: {
          orderBy: { timestamp: "desc" },
          take: 1,
          include: {
            sender: {
              select: { id: true, name: true, profilePic: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(chats);
  } catch (error) {
    next(error);
  }
};

/**
 * Get messages for a specific chat
 */
exports.getChatMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { limit = 50, before } = req.query;

    // Verify user is a participant
    const participant = await prisma.chatParticipant.findFirst({
      where: { chatId, userId },
    });

    if (!participant) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this chat" });
    }

    const messages = await prisma.message.findMany({
      where: {
        chatId,
        ...(before && { timestamp: { lt: new Date(before) } }),
      },
      orderBy: { timestamp: "desc" },
      take: parseInt(limit),
      include: {
        sender: {
          select: { id: true, name: true, profilePic: true },
        },
        reactions: {
          select: {
            emoji: true,
            userId: true,
          },
        },
        readReceipts: {
          select: {
            userId: true,
            readAt: true,
          },
        },
      },
    });

    // Format reactions as { messageId: { "👍": 5, "❤️": 3 } }
    const formatted = messages.map((msg) => {
      const reactionCounts = {};
      msg.reactions.forEach((r) => {
        reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
      });

      return {
        ...msg,
        reactionCounts,
        reactions: msg.reactions, // Keep full data for who reacted
      };
    });

    res.json(formatted.reverse());
  } catch (error) {
    next(error);
  }
};

/**
 * Send a message (REST fallback, prefer socket.io)
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const { chatId, text, attachmentUrl } = req.body;
    const senderId = req.user.id;

    // Require either text or attachment
    if (!chatId || (!text && !attachmentUrl)) {
      return res.status(400).json({
        message: "chatId and either text or attachmentUrl are required",
      });
    }

    // Verify user is a participant
    const participant = await prisma.chatParticipant.findFirst({
      where: { chatId, userId: senderId },
    });

    if (!participant) {
      return res
        .status(403)
        .json({ message: "Not authorized to send messages to this chat" });
    }

    // Check for flagged content
    const flaggedWord = checkForFlaggedContent(text);

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId,
        text: text || "",
        attachmentUrl: attachmentUrl || null,
      },
      include: {
        sender: {
          select: { id: true, name: true, profilePic: true },
        },
      },
    });

    // Auto-flag if inappropriate content detected
    if (flaggedWord) {
      await prisma.report.create({
        data: {
          reporterId: senderId, // System auto-report
          reportedUserId: senderId,
          reportedMessageId: message.id,
          reason: "inappropriate_content",
          description: `Auto-flagged for keyword: "${flaggedWord}". Message in chat ${chatId}: ${text}`,
          status: "pending",
        },
      });

      console.log(
        `🚩 Auto-flagged message ${message.id} for keyword: ${flaggedWord}`
      );
    }

    // Broadcast via socket for real-time delivery
    if (global.io) {
      global.io.to(chatId).emit("receive_message", message);
    }

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a message (only sender can delete/unsend)
 */
exports.deleteMessage = async (req, res, next) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.user.id;

    // Verify message exists and belongs to requester or user is moderator/admin
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, chatId: true, senderId: true },
    });

    if (!message || message.chatId !== chatId) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user is sender OR moderator/admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    const isSender = message.senderId === userId;
    const isModOrAdmin = user?.role === "moderator" || user?.role === "admin";

    if (!isSender && !isModOrAdmin) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this message" });
    }

    await prisma.message.delete({ where: { id: messageId } });

    // Broadcast deletion to room
    if (global.io) {
      global.io.to(chatId).emit("message_deleted", { messageId, chatId });
    }

    res.json({ message: "Message deleted" });
  } catch (error) {
    next(error);
  }
};

/**
 * Add reaction to a message
 */
exports.addReaction = async (req, res, next) => {
  try {
    const { chatId, messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    if (!emoji) {
      return res.status(400).json({ message: "Emoji is required" });
    }

    // Verify message exists in chat
    const message = await prisma.message.findFirst({
      where: { id: messageId, chatId },
    });

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user already reacted with this emoji
    const existing = await prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    });

    if (existing) {
      // Remove reaction (toggle off)
      await prisma.messageReaction.delete({ where: { id: existing.id } });

      // Broadcast reaction removed
      if (global.io) {
        global.io.to(chatId).emit("reaction_removed", {
          messageId,
          userId,
          emoji,
          chatId,
        });
      }

      return res.json({ message: "Reaction removed" });
    }

    // Add new reaction
    const reaction = await prisma.messageReaction.create({
      data: {
        messageId,
        userId,
        emoji,
      },
    });

    // Broadcast reaction added
    if (global.io) {
      global.io.to(chatId).emit("reaction_added", {
        messageId,
        userId,
        emoji,
        chatId,
      });
    }

    res.status(201).json(reaction);
  } catch (error) {
    next(error);
  }
};

/**
 * Get reactions for a message
 */
exports.getReactions = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    const reactions = await prisma.messageReaction.groupBy({
      by: ["emoji"],
      where: { messageId },
      _count: { emoji: true },
    });

    // Format: { "👍": 5, "❤️": 3 }
    const formatted = reactions.reduce((acc, r) => {
      acc[r.emoji] = r._count.emoji;
      return acc;
    }, {});

    res.json(formatted);
  } catch (error) {
    next(error);
  }
};

/**
 * Pin/unpin a message
 */
exports.togglePinMessage = async (req, res, next) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.user.id;

    // Verify message exists
    const message = await prisma.message.findFirst({
      where: { id: messageId, chatId },
    });

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Update pin status
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { isPinned: !message.isPinned },
      include: {
        sender: {
          select: { id: true, name: true, profilePic: true },
        },
      },
    });

    // Broadcast pin status change
    if (global.io) {
      global.io.to(chatId).emit("message_pinned", {
        messageId,
        isPinned: updated.isPinned,
        chatId,
      });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark message as read
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.user.id;

    console.log(`📖 markAsRead called: messageId=${messageId}, chatId=${chatId}, userId=${userId}`);

    // Verify message exists
    const message = await prisma.message.findFirst({
      where: { id: messageId, chatId },
    });

    if (!message) {
      console.log(`❌ Message not found: ${messageId}`);
      return res.status(404).json({ message: "Message not found" });
    }

    // Don't mark your own messages as read
    if (message.senderId === userId) {
      console.log(`⏭️ Skipping own message: ${messageId}`);
      return res.json({ message: "Cannot mark own message as read" });
    }

    // Create or update read receipt
    const read = await prisma.messageRead.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
      create: {
        messageId,
        userId,
      },
      update: {
        readAt: new Date(),
      },
    });

    console.log(`✅ Read receipt created for messageId=${messageId}, userId=${userId}`);

    // Broadcast read receipt
    if (global.io) {
      console.log(`📡 Broadcasting message_read to room ${chatId}`);
      global.io.to(chatId).emit("message_read", {
        messageId,
        userId,
        readAt: read.readAt,
        chatId,
      });
    } else {
      console.log(`⚠️ global.io not available!`);
    }

    res.json(read);
  } catch (error) {
    console.error(`❌ markAsRead error:`, error);
    next(error);
  }
};

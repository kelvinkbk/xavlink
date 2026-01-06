const prisma = require("../config/prismaClient");

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
      },
    });

    res.json(messages.reverse());
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
      return res.status(400).json({ message: "chatId and either text or attachmentUrl are required" });
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

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

const prisma = require("../config/prismaClient");

/**
 * Get all blocked users for the authenticated user
 */
exports.getBlockedUsers = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const blockedUsers = await prisma.blockedUser.findMany({
      where: { blockerId: userId },
      select: {
        id: true,
        blockedId: true,
        createdAt: true,
      },
    });

    // Return just the IDs for easy consumption by frontend
    const blockedIds = blockedUsers.map((b) => b.blockedId);
    res.json({ blockedUsers: blockedIds, details: blockedUsers });
  } catch (error) {
    next(error);
  }
};

/**
 * Block a user
 */
exports.blockUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { blockedId } = req.body;

    if (!blockedId) {
      return res.status(400).json({ message: "blockedId is required" });
    }

    if (blockedId === userId) {
      return res.status(400).json({ message: "Cannot block yourself" });
    }

    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: blockedId },
    });

    if (!userExists) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already blocked
    const existingBlock = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId,
        },
      },
    });

    if (existingBlock) {
      return res.status(400).json({ message: "User already blocked" });
    }

    const blockedUser = await prisma.blockedUser.create({
      data: {
        blockerId: userId,
        blockedId,
      },
    });

    res.status(201).json({ message: "User blocked successfully", blockedUser });
  } catch (error) {
    next(error);
  }
};

/**
 * Unblock a user
 */
exports.unblockUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { blockedId } = req.params;

    if (!blockedId) {
      return res.status(400).json({ message: "blockedId is required" });
    }

    const deletedBlock = await prisma.blockedUser.deleteMany({
      where: {
        blockerId: userId,
        blockedId,
      },
    });

    if (deletedBlock.count === 0) {
      return res.status(404).json({ message: "Block relationship not found" });
    }

    res.json({ message: "User unblocked successfully" });
  } catch (error) {
    next(error);
  }
};

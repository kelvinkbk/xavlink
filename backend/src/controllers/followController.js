const prisma = require("../config/prismaClient");
const { createNotification } = require("./notificationController");

// POST /api/users/:id/follow
exports.followUser = async (req, res) => {
  try {
    const { id: followingId } = req.params;
    const followerId = req.user?.id;

    if (!followerId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (followerId === followingId) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      return res.status(400).json({ message: "Already following this user" });
    }

    // Create follow relationship
    await prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });

    // Update follower/following counts
    await prisma.$transaction([
      prisma.user.update({
        where: { id: followerId },
        data: { followingCount: { increment: 1 } },
      }),
      prisma.user.update({
        where: { id: followingId },
        data: { followersCount: { increment: 1 } },
      }),
    ]);

    // Create notification
    try {
      // Fetch follower's name for notification message
      const followerUser = await prisma.user.findUnique({
        where: { id: followerId },
        select: { name: true },
      });
      await createNotification({
        userId: followingId,
        type: "follow",
        title: "New Follower",
        message: `${followerUser?.name || "Someone"} started following you`,
        relatedId: followerId,
      });
    } catch (notifErr) {
      console.error("Failed to create follow notification:", notifErr);
    }

    // Emit real-time update via Socket.io
    if (global.io) {
      console.log("📡 Broadcasting user_followed event:", {
        followerId,
        followingId,
      });
      global.io.emit("user_followed", { followerId, followingId });
    } else {
      console.warn("⚠️ global.io not available for user_followed");
    }

    res.json({ message: "Successfully followed user" });
  } catch (error) {
    console.error("Follow error:", error);
    res
      .status(500)
      .json({ message: "Failed to follow user", error: error.message });
  }
};

// DELETE /api/users/:id/follow
exports.unfollowUser = async (req, res) => {
  try {
    const { id: followingId } = req.params;
    const followerId = req.user?.id;

    if (!followerId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Delete follow relationship
    const deletedFollow = await prisma.follow.deleteMany({
      where: {
        followerId,
        followingId,
      },
    });

    if (deletedFollow.count === 0) {
      return res.status(400).json({ message: "Not following this user" });
    }

    // Update follower/following counts
    await prisma.$transaction([
      prisma.user.update({
        where: { id: followerId },
        data: { followingCount: { decrement: 1 } },
      }),
      prisma.user.update({
        where: { id: followingId },
        data: { followersCount: { decrement: 1 } },
      }),
    ]);

    // Emit real-time update via Socket.io
    if (global.io) {
      console.log("📡 Broadcasting user_unfollowed event:", {
        followerId,
        followingId,
      });
      global.io.emit("user_unfollowed", { followerId, followingId });
    } else {
      console.warn("⚠️ global.io not available for user_unfollowed");
    }

    res.json({ message: "Successfully unfollowed user" });
  } catch (error) {
    console.error("Unfollow error:", error);
    res
      .status(500)
      .json({ message: "Failed to unfollow user", error: error.message });
  }
};

// GET /api/users/:id/followers
exports.getFollowers = async (req, res) => {
  try {
    const { id: userId } = req.params;
    const { cursor, limit = 20 } = req.query;

    const queryOptions = {
      where: { followingId: userId },
      take: parseInt(limit) + 1,
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePic: true,
            bio: true,
            followersCount: true,
            followingCount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    };

    if (cursor) {
      queryOptions.cursor = { id: cursor };
      queryOptions.skip = 1;
    }

    const follows = await prisma.follow.findMany(queryOptions);

    const hasMore = follows.length > parseInt(limit);
    const followers = follows.slice(0, parseInt(limit)).map((f) => f.follower);
    const nextCursor = hasMore ? follows[parseInt(limit) - 1].id : null;

    res.json({
      followers,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Get followers error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch followers", error: error.message });
  }
};

// GET /api/users/:id/following or /api/users/me/following
exports.getFollowing = async (req, res) => {
  try {
    const { id } = req.params;
    // If route is /me/following, use authenticated user's ID
    const userId = id === 'me' || !id ? req.user?.id : id;
    
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const { cursor, limit = 20 } = req.query;

    const queryOptions = {
      where: { followerId: userId },
      take: parseInt(limit) + 1,
      include: {
        following: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePic: true,
            bio: true,
            followersCount: true,
            followingCount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    };

    if (cursor) {
      queryOptions.cursor = { id: cursor };
      queryOptions.skip = 1;
    }

    const follows = await prisma.follow.findMany(queryOptions);

    const hasMore = follows.length > parseInt(limit);
    const following = follows.slice(0, parseInt(limit)).map((f) => f.following);
    const nextCursor = hasMore ? follows[parseInt(limit) - 1].id : null;

    res.json({
      following,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Get following error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch following", error: error.message });
  }
};

// GET /api/users/:id/follow-status
exports.getFollowStatus = async (req, res) => {
  try {
    const { id: targetUserId } = req.params;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.json({ isFollowing: false, followsYou: false });
    }

    const [isFollowing, followsYou] = await Promise.all([
      prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: targetUserId,
          },
        },
      }),
      prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: targetUserId,
            followingId: currentUserId,
          },
        },
      }),
    ]);

    res.json({
      isFollowing: !!isFollowing,
      followsYou: !!followsYou,
    });
  } catch (error) {
    console.error("Get follow status error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch follow status", error: error.message });
  }
};

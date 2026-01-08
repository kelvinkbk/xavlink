const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Pin a post (only post owner can pin)
exports.pinPost = async (req, res) => {
  try {
    const { postId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!postId) {
      return res.status(400).json({ error: "postId is required" });
    }

    // Check if post exists and belongs to user
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.userId !== userId) {
      return res.status(403).json({ error: "You can only pin your own posts" });
    }

    if (post.isPinned) {
      return res.status(400).json({ error: "Post is already pinned" });
    }

    // Update post to pinned
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        isPinned: true,
        pinnedAt: new Date(),
      },
    });

    res.status(200).json({
      message: "Post pinned successfully",
      post: updatedPost,
    });
  } catch (err) {
    console.error("Error pinning post:", err);
    res.status(500).json({ error: "Failed to pin post" });
  }
};

// Unpin a post (only post owner can unpin)
exports.unpinPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!postId) {
      return res.status(400).json({ error: "postId is required" });
    }

    // Check if post exists and belongs to user
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.userId !== userId) {
      return res
        .status(403)
        .json({ error: "You can only unpin your own posts" });
    }

    if (!post.isPinned) {
      return res.status(400).json({ error: "Post is not pinned" });
    }

    // Update post to unpinned
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        isPinned: false,
        pinnedAt: null,
      },
    });

    res.status(200).json({
      message: "Post unpinned successfully",
      post: updatedPost,
    });
  } catch (err) {
    console.error("Error unpinning post:", err);
    res.status(500).json({ error: "Failed to unpin post" });
  }
};

// Get user's pinned posts
exports.getUserPinnedPosts = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const pinnedPosts = await prisma.post.findMany({
      where: {
        userId,
        isPinned: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePic: true,
            course: true,
          },
        },
      },
      orderBy: { pinnedAt: "desc" },
    });

    res.json({
      pinnedPosts,
    });
  } catch (err) {
    console.error("Error fetching pinned posts:", err);
    res.status(500).json({ error: "Failed to fetch pinned posts" });
  }
};

// Check if post is pinned
exports.isPostPinned = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({ error: "postId is required" });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { isPinned: true, pinnedAt: true },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({
      isPinned: post.isPinned,
      pinnedAt: post.pinnedAt,
    });
  } catch (err) {
    console.error("Error checking if post is pinned:", err);
    res.status(500).json({ error: "Failed to check pin status" });
  }
};

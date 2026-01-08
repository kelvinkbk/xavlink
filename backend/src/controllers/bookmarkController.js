const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all bookmarked posts for the current user
exports.getBookmarkedPosts = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      include: {
        post: {
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
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      bookmarks: bookmarks.map((b) => ({
        ...b.post,
        bookmarkedAt: b.createdAt,
      })),
    });
  } catch (err) {
    console.error("Error fetching bookmarks:", err);
    res.status(500).json({ error: "Failed to fetch bookmarks" });
  }
};

// Get bookmark IDs for current user (for quick lookup)
exports.getBookmarkIds = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      select: { postId: true },
    });

    res.json({
      bookmarkIds: bookmarks.map((b) => b.postId),
    });
  } catch (err) {
    console.error("Error fetching bookmark IDs:", err);
    res.status(500).json({ error: "Failed to fetch bookmark IDs" });
  }
};

// Add a bookmark
exports.addBookmark = async (req, res) => {
  try {
    const { postId } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!postId) {
      return res.status(400).json({ error: "postId is required" });
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if already bookmarked
    const existing = await prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: "Post already bookmarked" });
    }

    // Create bookmark
    const bookmark = await prisma.bookmark.create({
      data: {
        userId,
        postId,
      },
    });

    res.status(201).json({
      message: "Post bookmarked successfully",
      bookmark,
    });
  } catch (err) {
    console.error("Error adding bookmark:", err);
    res.status(500).json({ error: "Failed to bookmark post" });
  }
};

// Remove a bookmark
exports.removeBookmark = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!postId) {
      return res.status(400).json({ error: "postId is required" });
    }

    // Delete bookmark
    const bookmark = await prisma.bookmark.delete({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    res.json({
      message: "Bookmark removed successfully",
      bookmark,
    });
  } catch (err) {
    if (err.code === "P2025") {
      // Record not found
      return res.status(404).json({ error: "Bookmark not found" });
    }
    console.error("Error removing bookmark:", err);
    res.status(500).json({ error: "Failed to remove bookmark" });
  }
};

// Check if a post is bookmarked
exports.isBookmarked = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const bookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    res.json({
      isBookmarked: !!bookmark,
      bookmarkedAt: bookmark?.createdAt || null,
    });
  } catch (err) {
    console.error("Error checking bookmark:", err);
    res.status(500).json({ error: "Failed to check bookmark" });
  }
};

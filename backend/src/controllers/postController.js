const prisma = require("../config/prismaClient");
const { createNotification } = require("./notificationController");
const crypto = require("crypto");

// In-memory stores (since database tables are missing/broken)
const commentStore = {};
const likeStore = {}; // { postId: [userId1, userId2, ...] }

exports.createPost = async (req, res, next) => {
  try {
    console.log("📌 createPost called with body:", req.body);
    const { content, image } = req.body;
    if (!content) {
      return res.status(400).json({ message: "content is required" });
    }

    console.log("📌 Creating post for user:", req.user.id);

    // Try to create with image field, fallback if column doesn't exist
    let post;
    try {
      post = await prisma.post.create({
        data: {
          content,
          image: image || null,
          userId: req.user.id,
        },
        include: {
          user: {
            select: { id: true, name: true, profilePic: true, course: true },
          },
        },
      });
    } catch (err) {
      // If image column doesn't exist, create without it
      if (
        err.code === "P2010" ||
        err.message.includes("image") ||
        err.message.includes("Image") ||
        err.message.includes("does not exist")
      ) {
        console.log("⚠️ Image column not found, creating post without image");
        post = await prisma.post.create({
          data: {
            content,
            userId: req.user.id,
          },
          include: {
            user: {
              select: { id: true, name: true, profilePic: true, course: true },
            },
          },
        });
      } else {
        throw err;
      }
    }

    console.log("✅ Post created:", post.id);

    // Initialize empty comment and like stores for this post
    commentStore[post.id] = [];
    likeStore[post.id] = [];

    // Emit real-time event for new post
    if (global.io) {
      global.io.emit("new_post", {
        post: {
          ...post,
          likesCount: 0,
          commentsCount: 0,
          isLiked: false,
          isBookmarked: false,
        },
      });
    }

    res.status(201).json(post);
  } catch (err) {
    console.error("❌ createPost error:", err.message);
    console.error("❌ Full error:", err);
    next(err);
  }
};

exports.getAllPosts = async (req, res, next) => {
  try {
    console.log("📌 getAllPosts called");

    // Use raw SQL to avoid Prisma schema issues
    const posts = await prisma.$queryRaw`
      SELECT 
        "id", 
        "userId", 
        "content", 
        "image",
        "createdAt"
      FROM "Post" 
      ORDER BY "createdAt" DESC 
      LIMIT 20
    `;

    console.log("✅ Retrieved", posts?.length, "posts from raw SQL");

    // Get user info for each post
    const postsWithUsers = await Promise.all(
      (posts || []).map(async (post) => {
        try {
          const user = await prisma.user.findUnique({
            where: { id: post.userId },
            select: { id: true, name: true, profilePic: true, course: true },
          });
          return {
            ...post,
            user,
            likesCount: 0,
            commentsCount: 0,
            isLiked: false,
            isBookmarked: false,
          };
        } catch (err) {
          console.error("Error getting user:", err.message);
          return {
            ...post,
            user: null,
            likesCount: 0,
            commentsCount: 0,
            isLiked: false,
            isBookmarked: false,
          };
        }
      })
    );

    res.json({
      posts: postsWithUsers,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: posts?.length || 0,
        hasMore: false,
      },
    });
  } catch (err) {
    console.error("❌ getAllPosts error:", err.message);
    console.error("❌ Stack:", err.stack);
    res.status(500).json({ message: "Failed to load posts: " + err.message });
  }
};

exports.likePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id || !userId) {
      return res.status(400).json({ message: "Missing postId or userId" });
    }

    // Initialize post likes if not exists
    if (!likeStore[id]) {
      likeStore[id] = [];
    }

    // Check if already liked
    if (likeStore[id].includes(userId)) {
      return res.status(400).json({ message: "Post already liked" });
    }

    // Add like
    likeStore[id].push(userId);
    console.log(
      `❤️ Like stored: post ${id} by user ${userId} - total: ${likeStore[id].length}`
    );

    // Emit real-time event
    if (global.io) {
      global.io.emit("post_liked", {
        postId: id,
        userId,
        likesCount: likeStore[id].length,
      });
      console.log(`📡 Broadcasted like for post ${id}`);
    }

    return res.status(200).json({
      message: "Post liked",
      likesCount: likeStore[id].length,
    });
  } catch (err) {
    console.error("Error in likePost:", err.message);
    res.status(500).json({ message: "Failed to like post" });
  }
};

exports.unlikePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id || !userId) {
      return res.status(400).json({ message: "Missing postId or userId" });
    }

    // Initialize post likes if not exists
    if (!likeStore[id]) {
      likeStore[id] = [];
    }

    // Check if not liked
    const index = likeStore[id].indexOf(userId);
    if (index === -1) {
      return res.status(400).json({ message: "Post not liked yet" });
    }

    // Remove like
    likeStore[id].splice(index, 1);
    console.log(
      `💔 Unlike stored: post ${id} by user ${userId} - total: ${likeStore[id].length}`
    );

    // Emit real-time event
    if (global.io) {
      global.io.emit("post_unliked", {
        postId: id,
        userId,
        likesCount: likeStore[id].length,
      });
      console.log(`📡 Broadcasted unlike for post ${id}`);
    }

    return res.status(200).json({
      message: "Post unliked",
      likesCount: likeStore[id].length,
    });
  } catch (err) {
    console.error("Error in unlikePost:", err.message);
    res.status(500).json({ message: "Failed to unlike post" });
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    if (!id || !userId) {
      return res.status(400).json({ message: "Missing postId or userId" });
    }

    // Get user info
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, profilePic: true },
      });
    } catch (err) {
      console.error("Error fetching user:", err.message);
      user = { id: userId, name: "Unknown User", profilePic: null };
    }

    // Create comment and store in memory
    const commentId = crypto.randomUUID();
    const createdAt = new Date();

    // Initialize post comments if not exists
    if (!commentStore[id]) {
      commentStore[id] = [];
    }

    // Add comment to store
    const newComment = {
      id: commentId,
      postId: id,
      userId,
      text: text.trim(),
      user,
      createdAt,
      updatedAt: createdAt,
    };

    commentStore[id].push(newComment);
    console.log(
      `✅ Comment stored: post ${id} - total: ${commentStore[id].length}`
    );

    // Emit real-time event to all connected clients
    if (global.io) {
      global.io.emit("new_comment", {
        postId: id,
        comment: newComment,
      });
      console.log(`📡 Broadcasted new comment for post ${id}`);
    }

    return res.status(201).json(newComment);
  } catch (err) {
    console.error("Error in addComment:", err.message);
    res.status(500).json({ message: "Failed to add comment" });
  }
};

exports.getComments = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Return comments from memory store
    const comments = commentStore[id] || [];
    console.log(`📖 Retrieved ${comments.length} comments for post ${id}`);

    res.json({ comments });
  } catch (err) {
    console.error("Error in getComments:", err.message);
    res.status(500).json({ message: "Failed to load comments" });
  }
};

exports.getLikeCount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Get like count and check if user liked
    const likes = likeStore[id] || [];
    const isLiked = userId ? likes.includes(userId) : false;
    const likesCount = likes.length;

    console.log(
      `❤️ Like count for post ${id}: ${likesCount}, user liked: ${isLiked}`
    );

    res.json({ likesCount, isLiked });
  } catch (err) {
    console.error("Error in getLikeCount:", err.message);
    res.status(500).json({ message: "Failed to get like count" });
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find the post and verify ownership
    const post = await prisma.post.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this post" });
    }

    // Delete the post (cascade will handle likes, comments)
    await prisma.post.delete({
      where: { id },
    });

    // Emit real-time update via Socket.io
    if (global.io) {
      console.log("📡 Broadcasting post_deleted event:", { postId: id });
      global.io.emit("post_deleted", { postId: id });
    } else {
      console.warn("⚠️ global.io not available for post_deleted");
    }

    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { content, image } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    // Find the post and verify ownership
    const post = await prisma.post.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this post" });
    }

    // Update the post
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        content,
        ...(image !== undefined && { image }),
      },
      include: {
        user: {
          select: { id: true, name: true, profilePic: true, course: true },
        },
      },
    });

    // Emit real-time update via Socket.io
    if (global.io) {
      console.log("📡 Broadcasting post_updated event:", { postId: id });
      global.io.emit("post_updated", { postId: id, content, image });
    } else {
      console.warn("⚠️ global.io not available for post_updated");
    }

    res.json(updatedPost);
  } catch (err) {
    next(err);
  }
};

exports.updateComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    // Find the comment and verify ownership
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, postId: true },
    });

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this comment" });
    }

    // Update the comment
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { text },
      include: {
        user: {
          select: { id: true, name: true, profilePic: true },
        },
      },
    });

    // Emit real-time update via Socket.io
    if (global.io) {
      console.log("📡 Broadcasting comment_updated event:", { commentId });
      global.io.emit("comment_updated", {
        commentId,
        postId: comment.postId,
        text,
      });
    } else {
      console.warn("⚠️ global.io not available for comment_updated");
    }

    res.json(updatedComment);
  } catch (err) {
    next(err);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Find the comment and verify ownership
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, postId: true },
    });

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this comment" });
    }

    // Delete the comment
    await prisma.comment.delete({
      where: { id: commentId },
    });

    // Update post comments count
    await prisma.post.update({
      where: { id: comment.postId },
      data: { commentsCount: { decrement: 1 } },
    });

    // Emit real-time update via Socket.io
    if (global.io) {
      console.log("📡 Broadcasting comment_deleted event:", { commentId });
      global.io.emit("comment_deleted", {
        commentId,
        postId: comment.postId,
      });
    } else {
      console.warn("⚠️ global.io not available for comment_deleted");
    }

    res.json({ message: "Comment deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// Bookmark endpoints
exports.bookmarkPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    await prisma.bookmark.create({
      data: { postId: id, userId },
    });

    res.json({ message: "Post bookmarked" });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(200).json({ message: "Already bookmarked" });
    }
    next(err);
  }
};

exports.unbookmarkPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await prisma.bookmark.delete({
      where: { userId_postId: { userId, postId: id } },
    });

    res.json({ message: "Bookmark removed" });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(200).json({ message: "Bookmark already removed" });
    }
    next(err);
  }
};

exports.getBookmarkedPosts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [bookmarks, totalCount] = await prisma.$transaction([
      prisma.bookmark.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          post: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  profilePic: true,
                  course: true,
                },
              },
              _count: {
                select: { likes: true, comments: true, reactions: true },
              },
              likes: {
                where: { userId },
                select: { id: true },
              },
              reactions: {
                select: { emoji: true, userId: true },
              },
            },
          },
        },
      }),
      prisma.bookmark.count({ where: { userId } }),
    ]);

    const posts = bookmarks.map((b) => {
      const post = b.post;
      const isLiked = post.likes && post.likes.length > 0;

      const reactionSummary = post.reactions.reduce((acc, r) => {
        if (!acc[r.emoji]) acc[r.emoji] = { count: 0, users: [] };
        acc[r.emoji].count++;
        acc[r.emoji].users.push(r.userId);
        return acc;
      }, {});

      const userReaction = post.reactions.find(
        (r) => r.userId === userId
      )?.emoji;

      const { likes, reactions, _count, ...rest } = post;
      return {
        ...rest,
        likesCount: _count.likes,
        commentsCount: _count.comments,
        isLiked: isLiked || false,
        isBookmarked: true,
        reactionSummary,
        userReaction: userReaction || null,
      };
    });

    res.json({
      posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasMore: skip + take < totalCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Reaction endpoints
exports.addReaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    if (!emoji || !["👍", "❤️", "😂", "😮", "😢", "😡"].includes(emoji)) {
      return res.status(400).json({ message: "Invalid emoji" });
    }

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Remove existing reaction from this user (they can only react once with one emoji)
    await prisma.postReaction.deleteMany({
      where: { postId: id, userId },
    });

    // Add new reaction
    await prisma.postReaction.create({
      data: { postId: id, userId, emoji },
    });

    // Get updated reaction summary
    const reactions = await prisma.postReaction.findMany({
      where: { postId: id },
      select: { emoji: true, userId: true },
    });

    const reactionSummary = reactions.reduce((acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = { count: 0, users: [] };
      acc[r.emoji].count++;
      acc[r.emoji].users.push(r.userId);
      return acc;
    }, {});

    // Emit real-time update
    if (global.io) {
      global.io.emit("post_reaction_added", {
        postId: id,
        userId,
        emoji,
        reactionSummary,
      });
    }

    res.json({ message: "Reaction added", reactionSummary });
  } catch (err) {
    next(err);
  }
};

exports.removeReaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await prisma.postReaction.deleteMany({
      where: { postId: id, userId },
    });

    // Get updated reaction summary
    const reactions = await prisma.postReaction.findMany({
      where: { postId: id },
      select: { emoji: true, userId: true },
    });

    const reactionSummary = reactions.reduce((acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = { count: 0, users: [] };
      acc[r.emoji].count++;
      acc[r.emoji].users.push(r.userId);
      return acc;
    }, {});

    // Emit real-time update
    if (global.io) {
      global.io.emit("post_reaction_removed", {
        postId: id,
        userId,
        reactionSummary,
      });
    }

    res.json({ message: "Reaction removed", reactionSummary });
  } catch (err) {
    next(err);
  }
};

// ============= NEW FEATURES (15 features) =============

// 1. Search Posts
exports.searchPosts = async (req, res, next) => {
  try {
    const { q, sort = "recent", page = 1, limit = 10 } = req.query;
    const userId = req.user?.id;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [posts, totalCount] = await prisma.$transaction([
      prisma.post.findMany({
        where: {
          isDraft: false,
          OR: [{ content: { search: q } }, { richContent: { search: q } }],
        },
        orderBy:
          sort === "trending"
            ? [{ likesCount: "desc" }, { commentsCount: "desc" }]
            : sort === "most-liked"
            ? { likesCount: "desc" }
            : { createdAt: "desc" },
        skip,
        take,
        include: {
          user: {
            select: { id: true, name: true, profilePic: true, course: true },
          },
          _count: { select: { likes: true, comments: true } },
          likes: userId ? { where: { userId }, select: { id: true } } : false,
          bookmarks: userId
            ? { where: { userId }, select: { id: true } }
            : false,
        },
      }),
      prisma.post.count({
        where: {
          isDraft: false,
          OR: [{ content: { search: q } }, { richContent: { search: q } }],
        },
      }),
    ]);

    const postsWithStatus = posts.map((post) => {
      const { likes, bookmarks, _count, ...rest } = post;
      return {
        ...rest,
        likesCount: _count.likes,
        commentsCount: _count.comments,
        isLiked: userId && likes.length > 0,
        isBookmarked: userId && bookmarks.length > 0,
      };
    });

    res.json({
      posts: postsWithStatus,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasMore: skip + take < totalCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

// 2. Get Trending Topics
exports.getTrendingTopics = async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get all tags from last 7 days, group by tag, count occurrences
    const tags = await prisma.postTag.groupBy({
      by: ["tag"],
      where: {
        post: {
          createdAt: { gte: sevenDaysAgo },
          isDraft: false,
        },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    const trendingTopics = tags.map((t) => ({
      tag: t.tag,
      count: t._count.id,
    }));

    res.json({ trendingTopics });
  } catch (err) {
    next(err);
  }
};

// 3. Filter posts by tag
exports.getPostsByTag = async (req, res, next) => {
  try {
    const { tag } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user?.id;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [posts, totalCount] = await prisma.$transaction([
      prisma.post.findMany({
        where: {
          isDraft: false,
          tags: {
            some: { tag: { mode: "insensitive", equals: tag } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          user: {
            select: { id: true, name: true, profilePic: true, course: true },
          },
          _count: { select: { likes: true, comments: true } },
          likes: userId ? { where: { userId }, select: { id: true } } : false,
          bookmarks: userId
            ? { where: { userId }, select: { id: true } }
            : false,
          tags: { select: { tag: true } },
        },
      }),
      prisma.post.count({
        where: {
          isDraft: false,
          tags: {
            some: { tag: { mode: "insensitive", equals: tag } },
          },
        },
      }),
    ]);

    const postsWithStatus = posts.map((post) => {
      const { likes, bookmarks, _count, ...rest } = post;
      return {
        ...rest,
        likesCount: _count.likes,
        commentsCount: _count.comments,
        isLiked: userId && likes.length > 0,
        isBookmarked: userId && bookmarks.length > 0,
      };
    });

    res.json({
      posts: postsWithStatus,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasMore: skip + take < totalCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

// 4. Draft management - Create draft
exports.createDraft = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { content, images, richContent, tags, templateType } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Content is required" });
    }

    const draft = await prisma.draftPost.create({
      data: {
        userId,
        content,
        images: images || [],
        richContent: richContent || null,
        tags: tags || [],
        templateType: templateType || "default",
      },
    });

    res.status(201).json(draft);
  } catch (err) {
    next(err);
  }
};

// 5. Get drafts
exports.getDrafts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [drafts, totalCount] = await prisma.$transaction([
      prisma.draftPost.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.draftPost.count({ where: { userId } }),
    ]);

    res.json({
      drafts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasMore: skip + take < totalCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

// 6. Update draft
exports.updateDraft = async (req, res, next) => {
  try {
    const { draftId } = req.params;
    const userId = req.user.id;
    const { content, images, richContent, tags, templateType } = req.body;

    // Verify ownership
    const draft = await prisma.draftPost.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }

    if (draft.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this draft" });
    }

    const updated = await prisma.draftPost.update({
      where: { id: draftId },
      data: {
        ...(content && { content }),
        ...(images && { images }),
        ...(richContent !== undefined && { richContent }),
        ...(tags && { tags }),
        ...(templateType && { templateType }),
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// 7. Publish draft (convert to post)
exports.publishDraft = async (req, res, next) => {
  try {
    const { draftId } = req.params;
    const userId = req.user.id;

    const draft = await prisma.draftPost.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }

    if (draft.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to publish this draft" });
    }

    // Create post from draft and delete draft in transaction
    const post = await prisma.$transaction(async (tx) => {
      const newPost = await tx.post.create({
        data: {
          userId,
          content: draft.content,
          images: draft.images,
          richContent: draft.richContent,
          templateType: draft.templateType,
        },
        include: {
          user: {
            select: { id: true, name: true, profilePic: true, course: true },
          },
        },
      });

      // Add tags if any
      if (draft.tags && draft.tags.length > 0) {
        await Promise.all(
          draft.tags.map((tag) =>
            tx.postTag.create({
              data: { postId: newPost.id, tag },
            })
          )
        );
      }

      // Delete draft
      await tx.draftPost.delete({ where: { id: draftId } });

      return newPost;
    });

    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
};

// 8. Delete draft
exports.deleteDraft = async (req, res, next) => {
  try {
    const { draftId } = req.params;
    const userId = req.user.id;

    const draft = await prisma.draftPost.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }

    if (draft.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this draft" });
    }

    await prisma.draftPost.delete({ where: { id: draftId } });

    res.json({ message: "Draft deleted" });
  } catch (err) {
    next(err);
  }
};

// 9. Pin post (admin/owner only)
exports.pinPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await prisma.post.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Only owner or admin can pin
    if (post.userId !== userId && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Not authorized to pin this post" });
    }

    const pinned = await prisma.post.update({
      where: { id },
      data: {
        isPinned: true,
        pinnedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, name: true, profilePic: true, course: true },
        },
      },
    });

    if (global.io) {
      global.io.emit("post_pinned", { postId: id });
    }

    res.json(pinned);
  } catch (err) {
    next(err);
  }
};

// 10. Unpin post
exports.unpinPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await prisma.post.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.userId !== userId && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Not authorized to unpin this post" });
    }

    const unpinned = await prisma.post.update({
      where: { id },
      data: {
        isPinned: false,
        pinnedAt: null,
      },
      include: {
        user: {
          select: { id: true, name: true, profilePic: true, course: true },
        },
      },
    });

    if (global.io) {
      global.io.emit("post_unpinned", { postId: id });
    }

    res.json(unpinned);
  } catch (err) {
    next(err);
  }
};

// 11. Track post view
exports.trackPostView = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Create view record
    await prisma.postView.create({
      data: {
        postId: id,
        userId: userId || null, // Anonymous users have null userId
      },
    });

    // Update viewCount
    const updatedPost = await prisma.post.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true },
    });

    res.json({ viewCount: updatedPost.viewCount });
  } catch (err) {
    // Ignore if error (view tracking is not critical)
    next(err);
  }
};

// 12. Get post analytics
exports.getPostAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await prisma.post.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this analytics" });
    }

    // Get or create analytics
    let analytics = await prisma.postAnalytics.findUnique({
      where: { postId: id },
    });

    if (!analytics) {
      // Calculate analytics from scratch
      const views = await prisma.postView.count({ where: { postId: id } });
      const likes = await prisma.like.count({ where: { postId: id } });
      const comments = await prisma.comment.count({ where: { postId: id } });
      const shares = await prisma.postShare.count({ where: { postId: id } });

      analytics = await prisma.postAnalytics.create({
        data: {
          postId: id,
          viewsTotal: views,
          likesTotal: likes,
          commentsTotal: comments,
          sharesTotal: shares,
        },
      });
    }

    res.json(analytics);
  } catch (err) {
    next(err);
  }
};

// 13. Share post
exports.sharePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { shareType, sharedWithId } = req.body; // shareType: "link", "message", "public"
    const userId = req.user.id;

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (!["link", "message", "public"].includes(shareType)) {
      return res.status(400).json({ message: "Invalid share type" });
    }

    const share = await prisma.postShare.create({
      data: {
        postId: id,
        sharedBy: userId,
        shareType,
        sharedWith: shareType === "message" ? sharedWithId : null,
      },
    });

    if (global.io) {
      global.io.emit("post_shared", {
        postId: id,
        shareType,
        sharesCount: await prisma.postShare.count({ where: { postId: id } }),
      });
    }

    res.status(201).json(share);
  } catch (err) {
    next(err);
  }
};

// 14. Get suggested users (for follow/collaboration)
exports.getSuggestedUsers = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 5 } = req.query;

    // Get users not already followed
    const suggestedUsers = await prisma.user.findMany({
      where: {
        id: { not: userId },
      },
      select: {
        id: true,
        name: true,
        profilePic: true,
        course: true,
        _count: {
          select: { posts: true, followers: true },
        },
      },
      take: parseInt(limit),
    });

    res.json(suggestedUsers);
  } catch (err) {
    next(err);
  }
};

// 15. Keyword mute management
exports.addKeywordMute = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { keyword } = req.body;

    if (!keyword || keyword.trim().length === 0) {
      return res.status(400).json({ message: "Keyword is required" });
    }

    const mute = await prisma.keywordMute.create({
      data: {
        userId,
        keyword: keyword.toLowerCase().trim(),
      },
    });

    res.status(201).json(mute);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(200).json({ message: "Keyword already muted" });
    }
    next(err);
  }
};

// 16. Remove keyword mute
exports.removeKeywordMute = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { muteId } = req.params;

    const mute = await prisma.keywordMute.findUnique({
      where: { id: muteId },
      select: { userId: true },
    });

    if (!mute) {
      return res.status(404).json({ message: "Mute not found" });
    }

    if (mute.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to remove this mute" });
    }

    await prisma.keywordMute.delete({ where: { id: muteId } });

    res.json({ message: "Keyword mute removed" });
  } catch (err) {
    next(err);
  }
};

// 17. Get muted keywords
exports.getMutedKeywords = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const mutes = await prisma.keywordMute.findMany({
      where: { userId },
      select: { id: true, keyword: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(mutes);
  } catch (err) {
    next(err);
  }
};

const prisma = require("../config/prismaClient");
const { createNotification } = require("./notificationController");

exports.createPost = async (req, res, next) => {
  try {
    const { content, image } = req.body;
    if (!content) {
      return res.status(400).json({ message: "content is required" });
    }

    const post = await prisma.post.create({
      data: {
        content,
        image,
        userId: req.user.id,
      },
      include: {
        user: {
          select: { id: true, name: true, profilePic: true, course: true },
        },
      },
    });

    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
};

exports.getAllPosts = async (req, res, next) => {
  try {
    const currentUserId = req.user?.id;
    const { filter } = req.query; // 'all' or 'following'

    let whereClause = {};

    // If filter is 'following', only show posts from followed users
    if (filter === "following" && currentUserId) {
      const following = await prisma.follow.findMany({
        where: { followerId: currentUserId },
        select: { followingId: true },
      });
      const followingIds = following.map((f) => f.followingId);
      // Include own posts
      whereClause = {
        userId: { in: [...followingIds, currentUserId] },
      };
    }

    const posts = await prisma.post.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, profilePic: true, course: true },
        },
        _count: {
          select: { likes: true, comments: true },
        },
        likes: currentUserId
          ? {
              where: { userId: currentUserId },
              select: { id: true },
            }
          : false,
      },
    });

    // Map posts with isLiked flag
    const postsWithLikeStatus = posts.map((post) => {
      const isLiked = currentUserId && post.likes && post.likes.length > 0;
      const { likes, _count, ...rest } = post;
      return {
        ...rest,
        likesCount: _count.likes,
        commentsCount: _count.comments,
        isLiked: isLiked || false,
      };
    });

    res.json(postsWithLikeStatus);
  } catch (err) {
    next(err);
  }
};

exports.likePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id || !userId) {
      return res.status(400).json({ message: "Missing postId or userId" });
    }

    // First verify post exists
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Fetch actor info for readable notification message
    const actor = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Use a transaction to atomically create like and update count
    await prisma.$transaction(async (tx) => {
      // Try to create the like - will fail if already exists due to unique constraint
      await tx.like.create({
        data: { postId: id, userId },
      });

      // Only increment if create succeeded
      await tx.post.update({
        where: { id },
        data: { likesCount: { increment: 1 } },
      });

      // Create notification for post owner (only if not liking own post)
      if (post.userId !== userId) {
        await createNotification({
          userId: post.userId,
          type: "post_liked",
          title: "New Like",
          message: `${actor?.name || "Someone"} liked your post`,
          relatedId: id,
        });
      }
    });

    // Emit real-time update via Socket.io
    if (global.io) {
      console.log("📡 Broadcasting post_liked event:", {
        postId: id,
        userId,
        likesCount: post.likesCount + 1,
      });
      global.io.emit("post_liked", {
        postId: id,
        userId,
        likesCount: post.likesCount + 1,
      });
    } else {
      console.warn("⚠️ global.io not available for post_liked");
    }

    return res.status(200).json({ message: "Post liked" });
  } catch (err) {
    // Handle unique constraint violation gracefully (idempotent)
    if (err.code === "P2002") {
      return res.status(200).json({ message: "Post already liked" });
    }
    console.error("Error in likePost:", {
      code: err.code,
      message: err.message,
    });
    next(err);
  }
};

exports.unlikePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id || !userId) {
      return res.status(400).json({ message: "Missing postId or userId" });
    }

    // Use a transaction to atomically delete like and update count
    await prisma.$transaction(async (tx) => {
      // Delete the like - will throw if not found
      await tx.like.delete({
        where: { postId_userId: { postId: id, userId } },
      });

      // Only decrement if delete succeeded
      await tx.post.update({
        where: { id },
        data: { likesCount: { decrement: 1 } },
      });
    });

    // Emit real-time update via Socket.io
    const updatedPost = await prisma.post.findUnique({
      where: { id },
      select: { likesCount: true },
    });
    if (global.io) {
      console.log("📡 Broadcasting post_unliked event:", {
        postId: id,
        userId,
        likesCount: updatedPost?.likesCount || 0,
      });
      global.io.emit("post_unliked", {
        postId: id,
        userId,
        likesCount: updatedPost?.likesCount || 0,
      });
    } else {
      console.warn("⚠️ global.io not available for post_unliked");
    }

    return res.status(200).json({ message: "Post unliked" });
  } catch (err) {
    // Handle record not found idempotently
    if (err.code === "P2025") {
      return res.status(200).json({ message: "Post already unliked" });
    }
    console.error("Error in unlikePost:", {
      code: err.code,
      message: err.message,
    });
    next(err);
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

    // Get the post and user info
    const post = await prisma.post.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, profilePic: true },
    });

    // Use transaction to create comment, update count, and create notification
    const comment = await prisma.$transaction(async (tx) => {
      const newComment = await tx.comment.create({
        data: {
          postId: id,
          userId,
          text: text.trim(),
        },
      });

      await tx.post.update({
        where: { id },
        data: { commentsCount: { increment: 1 } },
      });

      // Create notification for post owner (only if not commenting on own post)
      if (post.userId !== userId) {
        await createNotification({
          userId: post.userId,
          type: "post_commented",
          title: "New Comment",
          message: `${user.name} commented on your post`,
          relatedId: id,
        });
      }

      return newComment;
    });

    res.status(201).json({ ...comment, user });
  } catch (err) {
    next(err);
  }
};

exports.getComments = async (req, res, next) => {
  try {
    const { id } = req.params;

    const comments = await prisma.comment.findMany({
      where: { postId: id },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: { id: true, name: true, profilePic: true },
        },
      },
    });

    res.json(comments);
  } catch (err) {
    next(err);
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

const prisma = require("../config/prismaClient");
const { logAction } = require("./auditLogController");

const validatePagination = (page, limit) => {
  const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = Math.max((Number(page) || 1) - 1, 0) * take;
  return { take, skip, page: Number(page) || 1 };
};

const sanitizeUser = (user) => {
  if (!user) return null;
  // eslint-disable-next-line no-unused-vars
  const { password, resetToken, resetTokenExpiry, ...rest } = user;
  return rest;
};

exports.listUsers = async (req, res, next) => {
  try {
    const { search = "", page = 1, limit = 20, suspended } = req.query;

    const { take, skip, page: currentPage } = validatePagination(page, limit);

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (suspended === "true") where.isSuspended = true;
    if (suspended === "false") where.isSuspended = false;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isSuspended: true,
          createdAt: true,
        },
      }),
    ]);

    res.json({ users, total, page: Number(page) || 1, limit: take });
  } catch (err) {
    next(err);
  }
};

exports.setSuspended = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isSuspended } = req.body;

    if (typeof isSuspended !== "boolean") {
      return res.status(400).json({ message: "isSuspended must be boolean" });
    }

    if (req.user.id === id) {
      return res
        .status(400)
        .json({ message: "You cannot change your own suspension" });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!target) return res.status(404).json({ message: "User not found" });

    // Moderators cannot act on admins
    if (target.role === "admin" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Cannot act on admins" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isSuspended },
    });

    // Log audit action
    await logAction(
      isSuspended ? "user_suspended" : "user_unsuspended",
      req.user.id,
      id,
      "user",
      { targetName: updated.name }
    );

    res.json({ user: sanitizeUser(updated) });
  } catch (err) {
    next(err);
  }
};

exports.editPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Content is required" });
    }

    const post = await prisma.post.findUnique({
      where: { id },
      select: { id: true, content: true },
    });

    if (!post) return res.status(404).json({ message: "Post not found" });

    const updated = await prisma.post.update({
      where: { id },
      data: {
        content: content.trim(),
      },
    });

    // Log audit action
    await logAction("post_edited", req.user.id, id, "post", {
      oldContent: post.content.substring(0, 100),
      newContent: content.substring(0, 100),
    });

    res.json({ post: updated });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Post not found" });
    }
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;

    const post = await prisma.post.findUnique({
      where: { id },
      select: { id: true, content: true },
    });

    if (!post) return res.status(404).json({ message: "Post not found" });

    await prisma.post.delete({ where: { id } });

    // Log audit action
    await logAction("post_deleted", req.user.id, id, "post", {
      preview: post.content.substring(0, 100),
    });

    res.json({ message: "Post deleted" });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Post not found" });
    }
    next(err);
  }
};

exports.listComments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const { take, skip, page: currentPage } = validatePagination(page, limit);

    const [total, comments] = await Promise.all([
      prisma.comment.count(),
      prisma.comment.findMany({
        skip,
        take,
        include: {
          user: { select: { id: true, name: true, email: true } },
          post: { select: { id: true, content: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    res.json({
      comments,
      total,
      page: currentPage,
      pages: Math.ceil(total / take),
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { id: true, text: true },
    });

    if (!comment) return res.status(404).json({ message: "Comment not found" });

    await prisma.comment.delete({ where: { id } });

    // Log audit action
    await logAction("comment_deleted", req.user.id, id, "comment", {
      preview: comment.text.substring(0, 100),
    });

    res.json({ message: "Comment deleted" });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Comment not found" });
    }
    next(err);
  }
};

exports.deleteUserReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { id },
      select: { id: true, rating: true },
    });

    if (!review) return res.status(404).json({ message: "Review not found" });

    await prisma.review.delete({ where: { id } });

    // Log audit action
    await logAction("review_deleted", req.user.id, id, "review", {
      rating: review.rating,
      type: "user",
    });

    res.json({ message: "User review deleted" });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Review not found" });
    }
    next(err);
  }
};

exports.deletePostReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await prisma.postReview.findUnique({
      where: { id },
      select: { id: true, rating: true },
    });

    if (!review)
      return res.status(404).json({ message: "Post review not found" });

    await prisma.postReview.delete({ where: { id } });

    // Log audit action
    await logAction("review_deleted", req.user.id, id, "review", {
      rating: review.rating,
      type: "post",
    });

    res.json({ message: "Post review deleted" });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Post review not found" });
    }
    next(err);
  }
};

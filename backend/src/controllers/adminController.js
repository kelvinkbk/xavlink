const prisma = require("../config/prismaClient");

const ROLE_VALUES = ["user", "moderator", "admin"];

const sanitizeUser = (user) => {
  if (!user) return null;
  // eslint-disable-next-line no-unused-vars
  const {
    password,
    resetToken,
    resetTokenExpiry,
    verificationToken,
    verificationTokenExpiry,
    ...rest
  } = user;
  return rest;
};

exports.getStats = async (req, res, next) => {
  try {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      suspendedUsers,
      verifiedUsers,
      postsThisWeek,
      totalPosts,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isSuspended: true } }),
      prisma.user.count({ where: { emailVerified: true } }),
      prisma.post.count({ where: { createdAt: { gte: oneWeekAgo } } }),
      prisma.post.count(),
    ]);

    res.json({
      totalUsers,
      suspendedUsers,
      verifiedUsers,
      postsThisWeek,
      totalPosts,
    });
  } catch (err) {
    next(err);
  }
};

exports.listUsers = async (req, res, next) => {
  try {
    const {
      search = "",
      page = 1,
      limit = 20,
      role,
      suspended,
      verified,
    } = req.query;

    const take = Math.min(Number(limit) || 20, 100);
    const skip = ((Number(page) || 1) - 1) * take;

    const filters = {};
    if (search) {
      filters.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (role && ROLE_VALUES.includes(role)) {
      filters.role = role;
    }
    if (suspended === "true") filters.isSuspended = true;
    if (suspended === "false") filters.isSuspended = false;
    if (verified === "true") filters.emailVerified = true;
    if (verified === "false") filters.emailVerified = false;

    const [total, users] = await Promise.all([
      prisma.user.count({ where: filters }),
      prisma.user.findMany({
        where: filters,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          name: true,
          email: true,
          bio: true,
          role: true,
          isSuspended: true,
          emailVerified: true,
          createdAt: true,
          followersCount: true,
          followingCount: true,
          postsCount: true,
        },
      }),
    ]);

    res.json({ users, total, page: Number(page) || 1, limit: take });
  } catch (err) {
    next(err);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!ROLE_VALUES.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Prevent admins from demoting themselves accidentally
    if (req.user.id === id) {
      return res
        .status(400)
        .json({ message: "Admins cannot change their own role" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
    });

    // Log role change
    const { logAction } = require("./auditLogController");
    await logAction("user_role_changed", req.user.id, id, "user", {
      oldRole: updated.role,
      newRole: role,
    });

    res.json({ user: sanitizeUser(updated) });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "User not found" });
    }
    next(err);
  }
};

exports.setSuspended = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isSuspended, durationDays } = req.body;

    if (typeof isSuspended !== "boolean") {
      return res.status(400).json({ message: "isSuspended must be boolean" });
    }

    // Prevent admins from suspending themselves
    if (req.user.id === id) {
      return res
        .status(400)
        .json({ message: "Admins cannot suspend themselves" });
    }

    let data = { isSuspended };

    if (isSuspended && durationDays && Number(durationDays) > 0) {
      const daysNum = Number(durationDays);
      const suspensionEndsAt = new Date();
      suspensionEndsAt.setDate(suspensionEndsAt.getDate() + daysNum);
      data.suspensionEndsAt = suspensionEndsAt;
    } else if (!isSuspended) {
      data.suspensionEndsAt = null;
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
    });

    res.json({ user: sanitizeUser(updated) });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "User not found" });
    }
    next(err);
  }
};

exports.updateUserDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, bio } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== id) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        bio,
      },
    });

    res.json({ user: sanitizeUser(updated) });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "User not found" });
    }
    next(err);
  }
};

exports.bulkSetSuspended = async (req, res, next) => {
  try {
    const { ids = [], isSuspended } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "ids array is required" });
    }
    if (typeof isSuspended !== "boolean") {
      return res.status(400).json({ message: "isSuspended must be boolean" });
    }

    const targetIds = ids.filter((x) => x && x !== req.user.id);
    if (targetIds.length === 0) {
      return res.status(400).json({ message: "No valid users to update" });
    }

    const result = await prisma.user.updateMany({
      where: { id: { in: targetIds } },
      data: { isSuspended },
    });

    res.json({ updated: result.count });
  } catch (err) {
    next(err);
  }
};

exports.bulkDeleteUsers = async (req, res, next) => {
  try {
    const { ids = [] } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "ids array is required" });
    }

    const targetIds = ids.filter((x) => x && x !== req.user.id);
    if (targetIds.length === 0) {
      return res.status(400).json({ message: "No valid users to delete" });
    }

    const result = await prisma.user.deleteMany({
      where: { id: { in: targetIds } },
    });
    res.json({ deleted: result.count });
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return res
        .status(400)
        .json({ message: "Admins cannot delete themselves" });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: "User deleted" });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "User not found" });
    }
    next(err);
  }
};

exports.setVerified = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { emailVerified } = req.body;

    if (typeof emailVerified !== "boolean") {
      return res.status(400).json({ message: "emailVerified must be boolean" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        emailVerified,
        // Clear any pending verification token if verifying
        verificationToken: emailVerified ? null : undefined,
        verificationTokenExpiry: emailVerified ? null : undefined,
      },
    });

    res.json({ user: sanitizeUser(updated) });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "User not found" });
    }
    next(err);
  }
};

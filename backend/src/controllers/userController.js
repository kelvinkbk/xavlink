const prisma = require("../config/prismaClient");

const sanitizeUser = (user) => {
  if (!user) return null;
  // eslint-disable-next-line no-unused-vars
  const { password, ...rest } = user;
  return rest;
};

exports.getProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(sanitizeUser(user));
  } catch (err) {
    next(err);
  }
};

exports.searchUsers = async (req, res, next) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res
        .status(400)
        .json({ message: "Search query must be at least 2 characters" });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { course: { contains: q, mode: "insensitive" } },
        ],
      },
      take: parseInt(limit),
      orderBy: { followersCount: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        profilePic: true,
        bio: true,
        course: true,
        year: true,
        followersCount: true,
        followingCount: true,
      },
    });

    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.getSuggestedUsers = async (req, res, next) => {
  try {
    const currentUserId = req.user?.id;
    const { limit = 10 } = req.query;

    const users = await prisma.user.findMany({
      where: currentUserId ? { id: { not: currentUserId } } : {},
      take: parseInt(limit),
      orderBy: { followersCount: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        profilePic: true,
        bio: true,
        course: true,
        followersCount: true,
        followingCount: true,
      },
    });

    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, bio, course, year, profilePic } = req.body;

    // Check if user is updating their own profile
    if (req.user.id !== id) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this profile" });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(bio !== undefined && { bio }),
        ...(course && { course }),
        ...(year && { year }),
        ...(profilePic !== undefined && { profilePic }),
      },
    });

    res.json(sanitizeUser(updatedUser));
  } catch (err) {
    next(err);
  }
};

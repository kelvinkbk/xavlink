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
    const { limit = 15 } = req.query;

    if (!currentUserId) {
      // Not authenticated, just return popular users
      const users = await prisma.user.findMany({
        take: parseInt(limit),
        orderBy: { followersCount: "desc" },
        select: {
          id: true,
          name: true,
          profilePic: true,
          bio: true,
          course: true,
          followersCount: true,
        },
      });
      return res.json({
        suggestions: [
          {
            category: "Popular",
            users: users,
          },
        ],
      });
    }

    // Get current user's info for similarity matching
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { course: true, year: true, id: true },
    });

    // Get current user's following list
    const currentUserFollowing = await prisma.follow.findMany({
      where: { followerId: currentUserId },
      select: { followingId: true },
    });
    const followingIds = new Set(
      currentUserFollowing.map((f) => f.followingId)
    );

    // Exclude current user and already-followed users
    const baseWhere = {
      id: { not: currentUserId },
    };

    // 1. Because you follow - People followed by people I follow
    const networkSuggestions = await prisma.follow.findMany({
      where: {
        followerId: { in: Array.from(followingIds) },
        followingId: { not: currentUserId },
      },
      select: { followingId: true },
    });

    const networkUserIds = [];
    const idFrequency = {};
    networkSuggestions.forEach((f) => {
      if (!followingIds.has(f.followingId)) {
        idFrequency[f.followingId] = (idFrequency[f.followingId] || 0) + 1;
        if (!networkUserIds.includes(f.followingId)) {
          networkUserIds.push(f.followingId);
        }
      }
    });

    // Sort by frequency (how many people you follow are following them)
    networkUserIds.sort((a, b) => idFrequency[b] - idFrequency[a]);

    const becauseYouFollowUsers = await prisma.user.findMany({
      where: { id: { in: networkUserIds.slice(0, 5) } },
      select: {
        id: true,
        name: true,
        profilePic: true,
        bio: true,
        course: true,
        followersCount: true,
      },
    });

    // 2. Similar to you - Same course/year/skills
    const similarUsers = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        AND: [{ course: currentUser?.course }],
      },
      take: 5,
      orderBy: { followersCount: "desc" },
      select: {
        id: true,
        name: true,
        profilePic: true,
        bio: true,
        course: true,
        year: true,
        followersCount: true,
      },
    });

    // 3. Popular this week - High engagement users
    const popularUsers = await prisma.user.findMany({
      where: { id: { not: currentUserId } },
      take: 5,
      orderBy: { followersCount: "desc" },
      select: {
        id: true,
        name: true,
        profilePic: true,
        bio: true,
        followersCount: true,
      },
    });

    // Build response with categories
    const suggestions = [];

    if (becauseYouFollowUsers.length > 0) {
      suggestions.push({
        category: "Because you follow",
        users: becauseYouFollowUsers,
      });
    }

    if (similarUsers.length > 0) {
      suggestions.push({
        category: "Similar to you",
        users: similarUsers,
      });
    }

    if (popularUsers.length > 0) {
      suggestions.push({
        category: "Popular",
        users: popularUsers,
      });
    }

    // If no categorized suggestions, just return popular users
    if (suggestions.length === 0) {
      const fallback = await prisma.user.findMany({
        where: { id: { not: currentUserId } },
        take: parseInt(limit),
        orderBy: { followersCount: "desc" },
        select: {
          id: true,
          name: true,
          profilePic: true,
          bio: true,
          followersCount: true,
        },
      });
      suggestions.push({
        category: "Suggested",
        users: fallback,
      });
    }

    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
};

exports.getMutualConnections = async (req, res, next) => {
  try {
    const currentUserId = req.user?.id;
    const { limit = 15 } = req.query;

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get current user's following list
    const currentUserFollowing = await prisma.follow.findMany({
      where: { followerId: currentUserId },
      select: { followingId: true },
    });
    const followingIds = new Set(
      currentUserFollowing.map((f) => f.followingId)
    );

    // Get current user's followers list
    const currentUserFollowers = await prisma.follow.findMany({
      where: { followingId: currentUserId },
      select: { followerId: true },
    });
    const followerIds = new Set(currentUserFollowers.map((f) => f.followerId));

    // Get current user's info
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { course: true },
    });

    // 1. Mutual connections - People I follow who also follow me back
    const mutualFollowIds = Array.from(followingIds).filter((id) =>
      followerIds.has(id)
    );

    const mutualFollows = await prisma.user.findMany({
      where: { id: { in: mutualFollowIds } },
      take: 5,
      orderBy: { followersCount: "desc" },
      select: {
        id: true,
        name: true,
        profilePic: true,
        bio: true,
        course: true,
        followersCount: true,
      },
    });

    // 2. Followed by your follows - People followed by people I follow
    const networkFollows = await prisma.follow.findMany({
      where: {
        followerId: { in: Array.from(followingIds) },
        followingId: { not: currentUserId },
      },
      select: { followingId: true },
    });

    const networkUserIds = [];
    const idFrequency = {};
    networkFollows.forEach((f) => {
      if (!followingIds.has(f.followingId)) {
        idFrequency[f.followingId] = (idFrequency[f.followingId] || 0) + 1;
        if (!networkUserIds.includes(f.followingId)) {
          networkUserIds.push(f.followingId);
        }
      }
    });

    networkUserIds.sort((a, b) => idFrequency[b] - idFrequency[a]);

    const followedByYourFollows = await prisma.user.findMany({
      where: { id: { in: networkUserIds.slice(0, 5) } },
      select: {
        id: true,
        name: true,
        profilePic: true,
        bio: true,
        course: true,
        followersCount: true,
      },
    });

    // 3. Same course - Users from my course (excluding already followed)
    const sameCourseUsers = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        course: currentUser?.course,
      },
      take: 5,
      orderBy: { followersCount: "desc" },
      select: {
        id: true,
        name: true,
        profilePic: true,
        bio: true,
        course: true,
        followersCount: true,
      },
    });

    // Build response with categories
    const connections = [];

    if (mutualFollows.length > 0) {
      connections.push({
        category: "Mutual Connections",
        description: "People you follow who also follow you back",
        users: mutualFollows,
      });
    }

    if (followedByYourFollows.length > 0) {
      connections.push({
        category: "Followed by your follows",
        description: "Popular among people you follow",
        users: followedByYourFollows,
      });
    }

    if (sameCourseUsers.length > 0) {
      connections.push({
        category: `From your course`,
        description: `Other students in ${
          currentUser?.course || "your course"
        }`,
        users: sameCourseUsers,
      });
    }

    if (connections.length === 0) {
      // Fallback: return popular users
      const popularUsers = await prisma.user.findMany({
        where: { id: { not: currentUserId } },
        take: parseInt(limit),
        orderBy: { followersCount: "desc" },
        select: {
          id: true,
          name: true,
          profilePic: true,
          bio: true,
          followersCount: true,
        },
      });
      connections.push({
        category: "Popular",
        users: popularUsers,
      });
    }

    res.json({ connections });
  } catch (err) {
    next(err);
  }
};

exports.getSkillBasedSuggestions = async (req, res, next) => {
  try {
    const currentUserId = req.user?.id;
    const { limit = 15 } = req.query;

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get current user's skills
    const currentUserSkills = await prisma.skill.findMany({
      where: { userId: currentUserId },
      select: { title: true },
    });

    const skillTitles = currentUserSkills.map((s) => s.title);

    if (skillTitles.length === 0) {
      // No skills, return empty
      return res.json({ skillSuggestions: [] });
    }

    // Get current user's following list
    const currentUserFollowing = await prisma.follow.findMany({
      where: { followerId: currentUserId },
      select: { followingId: true },
    });
    const followingIds = new Set(
      currentUserFollowing.map((f) => f.followingId)
    );

    // Find users with matching skills (excluding already followed)
    const usersWithMatchingSkills = await prisma.skill.findMany({
      where: {
        title: { in: skillTitles, mode: "insensitive" },
        userId: { not: currentUserId },
      },
      select: {
        userId: true,
        title: true,
        user: {
          select: {
            id: true,
            name: true,
            profilePic: true,
            bio: true,
            course: true,
            followersCount: true,
          },
        },
      },
    });

    // Group by user and count matching skills
    const userSkillCount = {};
    const userDetails = {};

    usersWithMatchingSkills.forEach((skill) => {
      if (!followingIds.has(skill.userId)) {
        userSkillCount[skill.userId] = (userSkillCount[skill.userId] || 0) + 1;
        if (!userDetails[skill.userId]) {
          userDetails[skill.userId] = skill.user;
        }
      }
    });

    // Sort by skill match count
    const sortedUserIds = Object.keys(userSkillCount).sort(
      (a, b) => userSkillCount[b] - userSkillCount[a]
    );

    const suggestedUsers = sortedUserIds
      .slice(0, parseInt(limit))
      .map((userId) => ({
        ...userDetails[userId],
        matchingSkillCount: userSkillCount[userId],
      }));

    res.json({ skillSuggestions: suggestedUsers });
  } catch (err) {
    next(err);
  }
};

exports.getHashtagBasedSuggestions = async (req, res, next) => {
  try {
    const currentUserId = req.user?.id;
    const { limit = 15 } = req.query;

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get current user's posts to extract hashtags
    const currentUserPosts = await prisma.post.findMany({
      where: { userId: currentUserId },
      select: { content: true },
    });

    // Extract hashtags from posts
    const hashtagRegex = /#\w+/g;
    const hashtagSet = new Set();
    currentUserPosts.forEach((post) => {
      const hashtags = post.content.match(hashtagRegex) || [];
      hashtags.forEach((tag) => {
        hashtagSet.add(tag.toLowerCase());
      });
    });

    if (hashtagSet.size === 0) {
      // No hashtags found, return empty
      return res.json({ hashtagSuggestions: [] });
    }

    // Get current user's following list
    const currentUserFollowing = await prisma.follow.findMany({
      where: { followerId: currentUserId },
      select: { followingId: true },
    });
    const followingIds = new Set(
      currentUserFollowing.map((f) => f.followingId)
    );

    // Find users with posts containing matching hashtags
    // Use OR conditions with contains instead of search (which requires full-text index)
    const hashtagArray = Array.from(hashtagSet);
    const postsWithHashtags = await prisma.post.findMany({
      where: {
        userId: { not: currentUserId },
        OR: hashtagArray.map((hashtag) => ({
          content: {
            contains: hashtag,
          },
        })),
      },
      select: {
        userId: true,
        content: true,
        user: {
          select: {
            id: true,
            name: true,
            profilePic: true,
            bio: true,
            course: true,
            followersCount: true,
          },
        },
      },
    });

    // Group by user and count hashtag matches
    const userHashtagCount = {};
    const userDetails = {};

    postsWithHashtags.forEach((post) => {
      if (!followingIds.has(post.userId)) {
        const postHashtags = post.content.match(hashtagRegex) || [];
        const matchingCount = postHashtags.filter((tag) =>
          hashtagSet.has(tag.toLowerCase())
        ).length;

        userHashtagCount[post.userId] =
          (userHashtagCount[post.userId] || 0) + matchingCount;
        if (!userDetails[post.userId]) {
          userDetails[post.userId] = post.user;
        }
      }
    });

    // Sort by hashtag match count
    const sortedUserIds = Object.keys(userHashtagCount).sort(
      (a, b) => userHashtagCount[b] - userHashtagCount[a]
    );

    const suggestedUsers = sortedUserIds
      .slice(0, parseInt(limit))
      .map((userId) => ({
        ...userDetails[userId],
        matchingHashtagCount: userHashtagCount[userId],
      }));

    res.json({ hashtagSuggestions: suggestedUsers });
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

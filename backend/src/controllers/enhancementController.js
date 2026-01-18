const prisma = require("../config/prismaClient");

// ============= DISCOVER ENHANCEMENTS =============

/**
 * Filter users by course/skills
 */
exports.filterUsersByCourseAndSkills = async (req, res, next) => {
  try {
    const { course, skills, year } = req.query;
    const currentUserId = req.user?.id;

    const where = {
      id: currentUserId ? { not: currentUserId } : undefined,
    };

    if (course) {
      where.course = course;
    }

    if (year) {
      where.year = parseInt(year);
    }

    if (skills) {
      const skillArray = Array.isArray(skills) ? skills : skills.split(",");
      where.skills = {
        some: {
          title: {
            in: skillArray,
          },
        },
      };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        profilePic: true,
        bio: true,
        course: true,
        year: true,
        followersCount: true,
        skills: {
          select: {
            title: true,
            category: true,
          },
        },
      },
      take: 50,
    });

    res.json({ users });
  } catch (err) {
    next(err);
  }
};

/**
 * Get trending skills
 */
exports.getTrendingSkills = async (req, res, next) => {
  try {
    const { course, limit = 10 } = req.query;

    // Get skills with most requests in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const trendingSkills = await prisma.skill.findMany({
      where: course
        ? {
            user: { course },
          }
        : {},
      include: {
        _count: {
          select: {
            requests: {
              where: {
                createdAt: {
                  gte: sevenDaysAgo,
                },
              },
            },
            endorsements: true,
          },
        },
        user: {
          select: {
            course: true,
          },
        },
      },
      orderBy: [
        {
          requests: {
            _count: "desc",
          },
        },
        {
          endorsements: {
            _count: "desc",
          },
        },
      ],
      take: parseInt(limit),
    });

    const formatted = trendingSkills.map((skill) => ({
      id: skill.id,
      title: skill.title,
      category: skill.category,
      proficiency: skill.proficiency,
      requestCount: skill._count.requests,
      endorsementCount: skill._count.endorsements,
      course: skill.user.course,
    }));

    res.json({ trendingSkills: formatted });
  } catch (err) {
    next(err);
  }
};

/**
 * Add user to favorites
 */
exports.addToFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { favoriteUserId } = req.body;

    if (userId === favoriteUserId) {
      return res.status(400).json({ message: "Cannot favorite yourself" });
    }

    const favorite = await prisma.favorite.upsert({
      where: {
        userId_favoriteUserId: {
          userId,
          favoriteUserId,
        },
      },
      update: {},
      create: {
        userId,
        favoriteUserId,
      },
    });

    res.json({ message: "Added to favorites", favorite });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(200).json({ message: "Already in favorites" });
    }
    next(err);
  }
};

/**
 * Remove from favorites
 */
exports.removeFromFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { favoriteUserId } = req.params;

    await prisma.favorite.deleteMany({
      where: {
        userId,
        favoriteUserId,
      },
    });

    res.json({ message: "Removed from favorites" });
  } catch (err) {
    next(err);
  }
};

/**
 * Get favorites list
 */
exports.getFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        favoriteUser: {
          select: {
            id: true,
            name: true,
            profilePic: true,
            bio: true,
            course: true,
            year: true,
            followersCount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      favorites: favorites.map((f) => f.favoriteUser),
    });
  } catch (err) {
    next(err);
  }
};

// ============= PROFILE ENHANCEMENTS =============

/**
 * Track profile view
 */
exports.trackProfileView = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user?.id;

    if (!viewerId || viewerId === userId) {
      return res.json({ message: "View not tracked" });
    }

    // Check if already viewed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingView = await prisma.profileView.findFirst({
      where: {
        userId,
        viewerId,
        viewedAt: {
          gte: today,
        },
      },
    });

    if (!existingView) {
      await prisma.profileView.create({
        data: {
          userId,
          viewerId,
        },
      });

      // Increment profile views count
      await prisma.user.update({
        where: { id: userId },
        data: {
          profileViews: {
            increment: 1,
          },
        },
      });
    }

    res.json({ message: "View tracked" });
  } catch (err) {
    next(err);
  }
};

/**
 * Get profile stats
 */
exports.getProfileStats = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        profileViews: true,
        followersCount: true,
        postsCount: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get views over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const viewsHistory = await prisma.profileView.findMany({
      where: {
        userId,
        viewedAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        viewedAt: true,
      },
    });

    // Group by date
    const viewsByDate = {};
    viewsHistory.forEach((view) => {
      const date = view.viewedAt.toISOString().split("T")[0];
      viewsByDate[date] = (viewsByDate[date] || 0) + 1;
    });

    res.json({
      profileViews: user.profileViews,
      followersCount: user.followersCount,
      postsCount: user.postsCount,
      memberSince: user.createdAt,
      viewsHistory: viewsByDate,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update social links
 */
exports.updateSocialLinks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { linkedInUrl, githubUrl, portfolioUrl } = req.body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        linkedInUrl: linkedInUrl || null,
        githubUrl: githubUrl || null,
        portfolioUrl: portfolioUrl || null,
      },
      select: {
        linkedInUrl: true,
        githubUrl: true,
        portfolioUrl: true,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

/**
 * Verify social link
 */
exports.verifySocialLink = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { platform } = req.params;

    // Get user's social links
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        linkedInUrl: true,
        githubUrl: true,
        portfolioUrl: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify based on platform
    let verified = false;
    const linkMap = {
      linkedin: user.linkedInUrl,
      github: user.githubUrl,
      portfolio: user.portfolioUrl,
    };

    const link = linkMap[platform.toLowerCase()];
    if (!link) {
      return res.status(400).json({ message: "Social link not found" });
    }

    // Simple verification: check if URL is valid and accessible
    try {
      // In production, you would make an actual HTTP request to verify ownership
      // For now, we'll just validate the URL format
      const urlObj = new URL(link);
      verified = urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch (e) {
      verified = false;
    }

    if (verified) {
      // Update verification status
      const verifyFieldMap = {
        linkedin: "linkedInVerified",
        github: "githubVerified",
        portfolio: "portfolioVerified",
      };

      const field = verifyFieldMap[platform.toLowerCase()];
      if (field) {
        await prisma.user.update({
          where: { id: userId },
          data: { [field]: true },
        });
      }
    }

    res.json({ verified, platform });
  } catch (err) {
    next(err);
  }
};

/**
 * Add user photo to gallery
 */
exports.addUserPhoto = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { url, caption } = req.body;

    // Get current max order
    const maxOrder = await prisma.userPhoto.findFirst({
      where: { userId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const photo = await prisma.userPhoto.create({
      data: {
        userId,
        url,
        caption: caption || null,
        order: (maxOrder?.order || 0) + 1,
      },
    });

    res.json(photo);
  } catch (err) {
    next(err);
  }
};

/**
 * Get user photos
 */
exports.getUserPhotos = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const photos = await prisma.userPhoto.findMany({
      where: { userId },
      orderBy: { order: "asc" },
    });

    res.json({ photos });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete user photo
 */
exports.deleteUserPhoto = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { photoId } = req.params;

    const photo = await prisma.userPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo || photo.userId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await prisma.userPhoto.delete({
      where: { id: photoId },
    });

    res.json({ message: "Photo deleted" });
  } catch (err) {
    next(err);
  }
};

/**
 * Get achievements
 */
exports.getAchievements = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const achievements = await prisma.achievement.findMany({
      where: { userId },
      orderBy: { earnedAt: "desc" },
    });

    res.json({ achievements });
  } catch (err) {
    next(err);
  }
};

// ============= SKILLS ENHANCEMENTS =============

/**
 * Endorse a skill
 */
exports.endorseSkill = async (req, res, next) => {
  try {
    const { skillId } = req.params;
    const endorserId = req.user.id;

    // Check if skill exists and belongs to different user
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      select: { userId: true },
    });

    if (!skill) {
      return res.status(404).json({ message: "Skill not found" });
    }

    if (skill.userId === endorserId) {
      return res.status(400).json({ message: "Cannot endorse your own skill" });
    }

    const endorsement = await prisma.skillEndorsement.upsert({
      where: {
        skillId_endorserId: {
          skillId,
          endorserId,
        },
      },
      update: {},
      create: {
        skillId,
        endorserId,
      },
    });

    res.json({ message: "Skill endorsed", endorsement });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(200).json({ message: "Already endorsed" });
    }
    next(err);
  }
};

/**
 * Remove endorsement
 */
exports.removeEndorsement = async (req, res, next) => {
  try {
    const { skillId } = req.params;
    const endorserId = req.user.id;

    await prisma.skillEndorsement.deleteMany({
      where: {
        skillId,
        endorserId,
      },
    });

    res.json({ message: "Endorsement removed" });
  } catch (err) {
    next(err);
  }
};

/**
 * Get most endorsed skills
 */
exports.getMostEndorsedSkills = async (req, res, next) => {
  try {
    const { limit = 10, course } = req.query;

    const skills = await prisma.skill.findMany({
      where: course
        ? {
            user: { course },
          }
        : {},
      include: {
        _count: {
          select: {
            endorsements: true,
          },
        },
        user: {
          select: {
            name: true,
            profilePic: true,
            course: true,
          },
        },
      },
      orderBy: {
        endorsements: {
          _count: "desc",
        },
      },
      take: parseInt(limit),
    });

    res.json({
      skills: skills.map((skill) => ({
        ...skill,
        endorsementCount: skill._count.endorsements,
      })),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Add certification to skill
 */
exports.addCertification = async (req, res, next) => {
  try {
    const { skillId } = req.params;
    const userId = req.user.id;
    const { name, issuer, issueDate, expiryDate, certificateUrl } = req.body;

    // Verify skill belongs to user
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!skill || skill.userId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const certification = await prisma.skillCertification.create({
      data: {
        skillId,
        name,
        issuer,
        issueDate: issueDate ? new Date(issueDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        certificateUrl: certificateUrl || null,
      },
    });

    res.json(certification);
  } catch (err) {
    next(err);
  }
};

/**
 * Get skill certifications
 */
exports.getSkillCertifications = async (req, res, next) => {
  try {
    const { skillId } = req.params;

    const certifications = await prisma.skillCertification.findMany({
      where: { skillId },
      orderBy: { issueDate: "desc" },
    });

    res.json({ certifications });
  } catch (err) {
    next(err);
  }
};

/**
 * Get skill recommendations (based on user's existing skills and course)
 */
exports.getSkillRecommendations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        course: true,
        skills: {
          select: {
            category: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userCategories = user.skills.map((s) => s.category);
    const course = user.course;

    // Find skills in same course/category that user doesn't have
    const recommendations = await prisma.skill.findMany({
      where: {
        userId: { not: userId },
        OR: [
          course ? { user: { course } } : {},
          userCategories.length > 0
            ? {
                category: {
                  in: userCategories,
                },
              }
            : {},
        ],
      },
      include: {
        user: {
          select: {
            name: true,
            profilePic: true,
            course: true,
          },
        },
        _count: {
          select: {
            endorsements: true,
          },
        },
      },
      take: 20,
    });

    res.json({
      recommendations: recommendations.map((skill) => ({
        ...skill,
        endorsementCount: skill._count.endorsements,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// ============= REQUESTS ENHANCEMENTS =============

/**
 * Create request template
 */
exports.createRequestTemplate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { title, message } = req.body;

    const template = await prisma.requestTemplate.create({
      data: {
        userId,
        title,
        message,
      },
    });

    res.json(template);
  } catch (err) {
    next(err);
  }
};

/**
 * Get request templates
 */
exports.getRequestTemplates = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const templates = await prisma.requestTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ templates });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete request template
 */
exports.deleteRequestTemplate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { templateId } = req.params;

    const template = await prisma.requestTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || template.userId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await prisma.requestTemplate.delete({
      where: { id: templateId },
    });

    res.json({ message: "Template deleted" });
  } catch (err) {
    next(err);
  }
};

/**
 * Get request history
 */
exports.getRequestHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type = "sent" } = req.query; // 'sent' or 'received'

    const where =
      type === "sent" ? { fromUserId: userId } : { toUserId: userId };

    const requests = await prisma.request.findMany({
      where,
      include: {
        skill: {
          select: {
            title: true,
            category: true,
          },
        },
        fromUser: {
          select: {
            name: true,
            profilePic: true,
          },
        },
        toUser: {
          select: {
            name: true,
            profilePic: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Calculate completion rate
    const completed = requests.filter((r) => r.status === "completed").length;
    const completionRate =
      requests.length > 0 ? (completed / requests.length) * 100 : 0;

    res.json({
      requests,
      stats: {
        total: requests.length,
        completed,
        completionRate: completionRate.toFixed(1),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Send counter-offer
 */
exports.sendCounterOffer = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;
    const { counterOffer, counterPrice } = req.body;

    const request = await prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request || request.toUserId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request is not pending" });
    }

    const updated = await prisma.request.update({
      where: { id: requestId },
      data: {
        counterOffer: counterOffer || null,
        counterPrice: counterPrice || null,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

/**
 * Mark request as completed
 */
exports.completeRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    const request = await prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.toUserId !== userId && request.fromUserId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updated = await prisma.request.update({
      where: { id: requestId },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// ============= NOTIFICATIONS ENHANCEMENTS =============

/**
 * Group notifications by type
 */
exports.getGroupedNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { timeFilter } = req.query; // 'today', 'week', 'month', 'all'

    let dateFilter = {};
    if (timeFilter === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dateFilter = { createdAt: { gte: today } };
    } else if (timeFilter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = { createdAt: { gte: weekAgo } };
    } else if (timeFilter === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = { createdAt: { gte: monthAgo } };
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        archived: false,
        ...dateFilter,
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });

    // Group by type
    const grouped = {};
    notifications.forEach((notif) => {
      if (!grouped[notif.type]) {
        grouped[notif.type] = [];
      }
      grouped[notif.type].push(notif);
    });

    res.json({ grouped, notifications });
  } catch (err) {
    next(err);
  }
};

/**
 * Pin notification
 */
exports.pinNotification = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isPinned: !notification.isPinned,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

/**
 * Archive notification
 */
exports.archiveNotification = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        archived: true,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

/**
 * Get archived notifications
 */
exports.getArchivedNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        archived: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json({ notifications });
  } catch (err) {
    next(err);
  }
};

// ============= MODERATION ENHANCEMENTS =============

/**
 * Add mod note to report
 */
exports.addModNote = async (req, res, next) => {
  try {
    const moderatorId = req.user.id;
    const { reportId } = req.params;
    const { note } = req.body;

    if (req.user.role !== "moderator" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const modNote = await prisma.modNote.create({
      data: {
        reportId,
        moderatorId,
        note,
      },
      include: {
        moderator: {
          select: {
            name: true,
          },
        },
      },
    });

    res.json(modNote);
  } catch (err) {
    next(err);
  }
};

/**
 * Get mod notes for report
 */
exports.getModNotes = async (req, res, next) => {
  try {
    const { reportId } = req.params;

    if (req.user.role !== "moderator" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const notes = await prisma.modNote.findMany({
      where: { reportId },
      include: {
        moderator: {
          select: {
            name: true,
            profilePic: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ notes });
  } catch (err) {
    next(err);
  }
};

/**
 * Get moderation dashboard stats
 */
exports.getModerationDashboard = async (req, res, next) => {
  try {
    if (req.user.role !== "moderator" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const [pendingReports, resolvedReports, dismissedReports, recentActions] =
      await Promise.all([
        prisma.report.count({
          where: { status: "pending" },
        }),
        prisma.report.count({
          where: { status: "resolved" },
        }),
        prisma.report.count({
          where: { status: "dismissed" },
        }),
        prisma.auditLog.findMany({
          where: {
            action: {
              in: [
                "user_suspended",
                "user_unsuspended",
                "post_deleted",
                "comment_deleted",
              ],
            },
          },
          include: {
            actor: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
      ]);

    res.json({
      stats: {
        pendingReports,
        resolvedReports,
        dismissedReports,
        totalReports: pendingReports + resolvedReports + dismissedReports,
      },
      recentActions,
    });
  } catch (err) {
    next(err);
  }
};

// ============= ADMIN ENHANCEMENTS =============

/**
 * Get analytics dashboard
 */
exports.getAnalyticsDashboard = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const [
      totalUsers,
      activeUsers,
      totalPosts,
      totalSkills,
      totalRequests,
      usersByRole,
      postsLast7Days,
      usersLast7Days,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastActiveAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.post.count(),
      prisma.skill.count(),
      prisma.request.count(),
      prisma.user.groupBy({
        by: ["role"],
        _count: true,
      }),
      prisma.post.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    res.json({
      overview: {
        totalUsers,
        activeUsers,
        totalPosts,
        totalSkills,
        totalRequests,
      },
      usersByRole: usersByRole.map((u) => ({
        role: u.role,
        count: u._count,
      })),
      growth: {
        postsLast7Days,
        usersLast7Days,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get system health
 */
exports.getSystemHealth = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Test database connection
    const dbStart = Date.now();
    await prisma.user.count(); // MongoDB health check
    const dbLatency = Date.now() - dbStart;

    // Get database stats from MongoDB
    const [userCount, postCount] = await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
    ]);

    res.json({
      database: {
        status: "connected",
        latency: `${dbLatency}ms`,
        size: "N/A", // MongoDB doesn't expose size via Prisma ORM
      },
      api: {
        status: "operational",
        uptime: process.uptime(),
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
    });
  } catch (err) {
    res.status(503).json({
      database: {
        status: "disconnected",
        error: err.message,
      },
    });
  }
};

// ============= DEVICE MANAGEMENT =============

/**
 * Get device sessions
 */
exports.getDeviceSessions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userAgent = req.headers["user-agent"] || "Unknown";
    const ipAddress =
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      "Unknown";

    // Generate current device fingerprint (same logic as in authController)
    const crypto = require("crypto");
    const currentDeviceId = crypto
      .createHash("sha256")
      .update(`${userAgent}-${ipAddress}`)
      .digest("hex")
      .substring(0, 16);

    const sessions = await prisma.deviceSession.findMany({
      where: { userId },
      orderBy: { lastActiveAt: "desc" },
    });

    res.json({ sessions, currentDeviceId });
  } catch (err) {
    next(err);
  }
};

/**
 * Revoke device session
 */
exports.revokeDeviceSession = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    const session = await prisma.deviceSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await prisma.deviceSession.delete({
      where: { id: sessionId },
    });

    res.json({ message: "Session revoked" });
  } catch (err) {
    next(err);
  }
};

/**
 * Revoke all other sessions
 */
exports.revokeAllOtherSessions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentDeviceId } = req.body;

    await prisma.deviceSession.deleteMany({
      where: {
        userId,
        deviceId: {
          not: currentDeviceId,
        },
      },
    });

    res.json({ message: "All other sessions revoked" });
  } catch (err) {
    next(err);
  }
};
// ============= SCHEDULED POSTS =============

/**
 * Schedule a post for future publishing
 */
exports.schedulePost = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { content, scheduledAt } = req.body;

    if (!content || !scheduledAt) {
      return res
        .status(400)
        .json({ message: "Content and scheduledAt are required" });
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      return res
        .status(400)
        .json({ message: "Scheduled date must be in the future" });
    }

    // Get image URL from uploaded file (if any)
    const imageUrl = req.file ? req.file.path : null;

    const post = await prisma.post.create({
      data: {
        content,
        image: imageUrl,
        userId,
        scheduledAt: scheduledDate,
        isScheduled: true,
      },
      include: {
        user: {
          select: { id: true, name: true, profilePic: true },
        },
      },
    });

    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
};

/**
 * Get scheduled posts for current user
 */
exports.getScheduledPosts = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const posts = await prisma.post.findMany({
      where: {
        userId,
        isScheduled: true,
        scheduledAt: {
          gt: new Date(),
        },
      },
      orderBy: { scheduledAt: "asc" },
      include: {
        user: {
          select: { id: true, name: true, profilePic: true },
        },
      },
    });

    res.json({ posts });
  } catch (err) {
    next(err);
  }
};

/**
 * Cancel scheduled post
 */
exports.cancelScheduledPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await prisma.post.findUnique({ where: { id: postId } });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.userId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await prisma.post.delete({ where: { id: postId } });

    res.json({ message: "Scheduled post cancelled" });
  } catch (err) {
    next(err);
  }
};

// ============= ACTIVITY TIMELINE =============

/**
 * Get activity timeline for user
 */
exports.getActivityTimeline = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const activities = await prisma.activity.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        post: {
          select: { id: true, content: true },
        },
      },
    });

    const total = await prisma.activity.count({ where: { userId } });

    res.json({ activities, total });
  } catch (err) {
    next(err);
  }
};

/**
 * Log user activity
 */
exports.logActivity = async (
  userId,
  type,
  description = null,
  postId = null,
  targetUserId = null
) => {
  try {
    await prisma.activity.create({
      data: {
        userId,
        type,
        description,
        postId,
        targetUserId,
      },
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
};

// ============= SKILL RECOMMENDATIONS =============

/**
 * Get skill recommendations for user
 */
exports.getSkillRecommendations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const recommendations = await prisma.skillRecommendation.findMany({
      where: { userId },
      orderBy: { score: "desc" },
      take: 10,
    });

    res.json({ recommendations });
  } catch (err) {
    next(err);
  }
};

/**
 * Generate skill recommendations based on endorsements and trends
 */
exports.generateSkillRecommendations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userSkills = user.skills.map((s) => s.title);

    // Get skills with endorsements (trending)
    const endorsedSkills = await prisma.skillEndorsement.groupBy({
      by: ["skillId"],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 20,
    });

    // Get user's course to recommend related skills
    const courseSkills = await prisma.skill.findMany({
      where: {
        user: { course: user.course },
        NOT: {
          title: { in: userSkills },
        },
      },
      select: { title: true },
      distinct: ["title"],
      take: 15,
    });

    // Clear existing recommendations
    await prisma.skillRecommendation.deleteMany({ where: { userId } });

    // Create new recommendations
    const recommendations = [];

    // Add trending skills
    for (const endorsement of endorsedSkills.slice(0, 5)) {
      const skill = await prisma.skill.findUnique({
        where: { id: endorsement.skillId },
      });

      if (skill && !userSkills.includes(skill.title)) {
        recommendations.push({
          userId,
          skillName: skill.title,
          reason: "trending_endorsements",
          score: Math.min(0.95, 0.7 + endorsement._count.id * 0.05),
        });
      }
    }

    // Add course-related skills
    for (const skill of courseSkills.slice(0, 5)) {
      if (!recommendations.some((r) => r.skillName === skill.title)) {
        recommendations.push({
          userId,
          skillName: skill.title,
          reason: "trending_in_course",
          score: 0.75,
        });
      }
    }

    if (recommendations.length > 0) {
      await prisma.skillRecommendation.createMany({
        data: recommendations,
      });
    }

    res.json({ recommendations, total: recommendations.length });
  } catch (err) {
    next(err);
  }
};

// ============= SYSTEM HEALTH =============

/**
 * Get system health metrics (admin only)
 */
exports.getSystemHealthMetrics = async (req, res, next) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalPosts = await prisma.post.count();
    const totalSkills = await prisma.skill.count();
    const activeUsers = await prisma.user.count({
      where: {
        lastActiveAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    const scheduledPosts = await prisma.post.count({
      where: {
        isScheduled: true,
        scheduledAt: { gt: new Date() },
      },
    });

    const pendingRequests = await prisma.request.count({
      where: { status: "pending" },
    });

    res.json({
      totalUsers,
      totalPosts,
      totalSkills,
      activeUsers,
      scheduledPosts,
      pendingRequests,
      timestamp: new Date(),
      status: "healthy",
    });
  } catch (err) {
    next(err);
  }
};

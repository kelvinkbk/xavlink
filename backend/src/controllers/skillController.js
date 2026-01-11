const prisma = require("../config/prismaClient");

// Add a skill for the authenticated user. Frontend currently only sends `title`,
// so we fill required Prisma fields with sensible defaults.
exports.addSkill = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      subcategory,
      priceRange,
      proficiency,
    } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "title is required" });
    }

    const skill = await prisma.skill.create({
      data: {
        title: title.trim(),
        description: (description || "").trim() || "General skill",
        category: (category || "general").trim(),
        subcategory: subcategory || null,
        priceRange,
        proficiency: proficiency || "beginner",
        userId: req.user.id,
      },
    });

    res.status(201).json(skill);
  } catch (err) {
    next(err);
  }
};

// List skills for a specific user (public)
exports.getSkillsByUser = async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const skills = await prisma.skill.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        subcategory: true,
        priceRange: true,
        proficiency: true,
        userId: true,
      },
    });

    res.json(skills);
  } catch (err) {
    next(err);
  }
};

// Delete a skill owned by the authenticated user
exports.deleteSkill = async (req, res, next) => {
  try {
    const { id } = req.params;
    const skill = await prisma.skill.findUnique({ where: { id } });

    if (!skill) {
      return res.status(404).json({ message: "Skill not found" });
    }
    if (skill.userId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not allowed to delete this skill" });
    }

    await prisma.skill.delete({ where: { id } });
    res.json({ message: "Skill deleted" });
  } catch (err) {
    next(err);
  }
};

// Search skills (existing behavior kept for compatibility)
exports.searchSkills = async (req, res, next) => {
  try {
    const search = req.query.search || "";
    const skills = await prisma.skill.findMany({
      where: {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { category: { contains: search, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            course: true,
            year: true,
            profilePic: true,
          },
        },
      },
    });

    res.json(skills);
  } catch (err) {
    next(err);
  }
};

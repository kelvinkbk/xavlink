const prisma = require('../config/prismaClient');

exports.addSkill = async (req, res, next) => {
  try {
    const { title, description, category, priceRange } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({ message: 'title, description, and category are required' });
    }

    const skill = await prisma.skill.create({
      data: {
        title,
        description,
        category,
        priceRange,
        userId: req.user.id,
      },
    });

    res.status(201).json(skill);
  } catch (err) {
    next(err);
  }
};

exports.searchSkills = async (req, res, next) => {
  try {
    const search = req.query.search || '';
    const skills = await prisma.skill.findMany({
      where: {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
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

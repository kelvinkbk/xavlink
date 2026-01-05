const prisma = require("../config/prismaClient");

const validatePagination = (page, limit) => {
  const take = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const skip = Math.max((Number(page) || 1) - 1, 0) * take;
  return { take, skip, page: Number(page) || 1 };
};

exports.listAuditLogs = async (req, res, next) => {
  try {
    const { action, page = 1, limit = 50 } = req.query;

    const { take, skip, page: currentPage } = validatePagination(page, limit);

    const where = {};
    if (action) {
      where.action = action;
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
    ]);

    res.json({
      logs,
      total,
      page: currentPage,
      pages: Math.ceil(total / take),
    });
  } catch (err) {
    next(err);
  }
};

exports.logAction = async (
  action,
  actorId,
  targetId = null,
  targetType = null,
  details = null
) => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        actorId,
        targetId: targetId || null,
        targetType: targetType || null,
        details: details ? JSON.stringify(details) : null,
      },
    });
  } catch (err) {
    console.error("Error logging audit action:", err);
  }
};

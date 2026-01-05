const prisma = require("../config/prismaClient");

// Auto-lift expired suspensions
exports.checkExpiredSuspensions = async (req, res, next) => {
  try {
    const now = new Date();

    await prisma.user.updateMany({
      where: {
        isSuspended: true,
        suspensionEndsAt: {
          lte: now,
        },
      },
      data: {
        isSuspended: false,
        suspensionEndsAt: null,
      },
    });

    next();
  } catch (err) {
    console.error("Error checking expired suspensions:", err);
    next();
  }
};

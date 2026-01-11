const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const prisma = require("../config/prismaClient");

const router = express.Router();

// Check current profile pictures (first 20 users)
router.get("/check-profiles", authMiddleware, async (req, res) => {
  try {
    // Only allow admin users
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const users = await prisma.user.findMany({
      select: { id: true, name: true, profilePic: true },
      take: 20,
    });

    const stats = {
      total: users.length,
      withOldUrls: users.filter((u) => u.profilePic?.includes("/uploads/"))
        .length,
      withCloudinary: users.filter((u) =>
        u.profilePic?.includes("cloudinary")
      ).length,
      withNull: users.filter((u) => !u.profilePic).length,
    };

    res.json({ stats, users });
  } catch (err) {
    console.error("Check profiles error:", err);
    res.status(500).json({ message: "Failed to check profiles" });
  }
});

// Clear old profile pictures (ones with /uploads/ in URL)
router.post("/clear-old-profiles", authMiddleware, async (req, res) => {
  try {
    // Only allow admin users
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const result = await prisma.user.updateMany({
      where: {
        profilePic: {
          contains: "/uploads/",
        },
      },
      data: {
        profilePic: null,
      },
    });

    res.json({
      message: `Cleared ${result.count} old profile pictures`,
      count: result.count,
    });
  } catch (err) {
    console.error("Clear profiles error:", err);
    res.status(500).json({ message: "Failed to clear profiles" });
  }
});

module.exports = router;

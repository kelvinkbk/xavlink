const express = require("express");
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:userId", authMiddleware, getNotifications);
router.get("/:userId/unread-count", authMiddleware, getUnreadCount);
router.put("/:id/read", authMiddleware, markAsRead);
router.put("/:userId/read-all", authMiddleware, markAllAsRead);
router.delete("/:id", authMiddleware, deleteNotification);

module.exports = router;

const express = require("express");
const router = express.Router();
const blockController = require("../controllers/blockController");
const authMiddleware = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authMiddleware);

// GET /api/users/blocked - Get all blocked users
router.get("/", blockController.getBlockedUsers);

// POST /api/users/blocked - Block a user
router.post("/", blockController.blockUser);

// DELETE /api/users/blocked/:blockedId - Unblock a user
router.delete("/:blockedId", blockController.unblockUser);

module.exports = router;

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  pinPost,
  unpinPost,
  getUserPinnedPosts,
  isPostPinned,
} = require("../controllers/pinController");

// All pin routes require authentication
router.use(authMiddleware);

// Pin a post
router.post("/", pinPost);

// Get user's pinned posts
router.get("/", getUserPinnedPosts);

// Check if post is pinned
router.get("/:postId/check", isPostPinned);

// Unpin a post
router.delete("/:postId", unpinPost);

module.exports = router;

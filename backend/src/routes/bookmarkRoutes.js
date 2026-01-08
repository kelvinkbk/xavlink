const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getBookmarkedPosts,
  getBookmarkIds,
  addBookmark,
  removeBookmark,
  isBookmarked,
} = require("../controllers/bookmarkController");

// All bookmark routes require authentication
router.use(authMiddleware);

// Get all bookmarked posts
router.get("/", getBookmarkedPosts);

// Get bookmark IDs only (for quick lookup)
router.get("/ids", getBookmarkIds);

// Check if a specific post is bookmarked
router.get("/:postId/check", isBookmarked);

// Add a bookmark
router.post("/", addBookmark);

// Remove a bookmark
router.delete("/:postId", removeBookmark);

module.exports = router;

const express = require("express");
const {
  createPost,
  getAllPosts,
  likePost,
  unlikePost,
  addComment,
  getComments,
  deletePost,
  updatePost,
  updateComment,
  deleteComment,
  bookmarkPost,
  unbookmarkPost,
  getBookmarkedPosts,
  addReaction,
  removeReaction,
  getLikeCount,
  // New endpoints
  searchPosts,
  getTrendingTopics,
  getPostsByTag,
  createDraft,
  getDrafts,
  updateDraft,
  publishDraft,
  deleteDraft,
  pinPost,
  unpinPost,
  trackPostView,
  getPostAnalytics,
  sharePost,
  getSuggestedUsers,
  addKeywordMute,
  removeKeywordMute,
  getMutedKeywords,
} = require("../controllers/postController");
const authMiddleware = require("../middleware/authMiddleware");
const { optionalAuthMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// === SPECIFIC ROUTES FIRST (before dynamic :id routes) ===

// 1. Search
router.get("/search", optionalAuthMiddleware, searchPosts);

// 2. Trending & Tags
router.get("/trending/topics", getTrendingTopics);

// 3. Draft management (specific paths)
router.post("/drafts/create", authMiddleware, createDraft);
router.get("/drafts", authMiddleware, getDrafts);
router.patch("/drafts/:draftId", authMiddleware, updateDraft);
router.post("/drafts/:draftId/publish", authMiddleware, publishDraft);
router.delete("/drafts/:draftId", authMiddleware, deleteDraft);

// 4. Bookmarks
router.get("/bookmarks", authMiddleware, getBookmarkedPosts);

// 5. Suggested users
router.get("/users/suggested", authMiddleware, getSuggestedUsers);

// 6. Keyword mute
router.post("/mute-keywords", authMiddleware, addKeywordMute);
router.delete("/mute-keywords/:muteId", authMiddleware, removeKeywordMute);
router.get("/mute-keywords", authMiddleware, getMutedKeywords);

// 7. Tags by tag name
router.get("/tags/:tag", optionalAuthMiddleware, getPostsByTag);

// === DYNAMIC :id ROUTES (most specific after static routes) ===

// Basic CRUD
router.post("/create", authMiddleware, createPost);
router.get("/all", optionalAuthMiddleware, getAllPosts);

// Comments
router.post("/:id/comments", authMiddleware, addComment);
router.get("/:id/comments", getComments);
router.patch("/comments/:commentId", authMiddleware, updateComment);
router.delete("/comments/:commentId", authMiddleware, deleteComment);

// Likes
router.post("/:id/like", authMiddleware, likePost);
router.delete("/:id/like", authMiddleware, unlikePost);
router.get("/:id/likes", authMiddleware, getLikeCount);

// Bookmarks
router.post("/:id/bookmark", authMiddleware, bookmarkPost);
router.delete("/:id/bookmark", authMiddleware, unbookmarkPost);

// Reactions
router.post("/:id/reaction", authMiddleware, addReaction);
router.delete("/:id/reaction", authMiddleware, removeReaction);

// Pin posts
router.post("/:id/pin", authMiddleware, pinPost);
router.delete("/:id/pin", authMiddleware, unpinPost);

// View tracking
router.post("/:id/view", optionalAuthMiddleware, trackPostView);

// Analytics
router.get("/:id/analytics", authMiddleware, getPostAnalytics);

// Share posts
router.post("/:id/share", authMiddleware, sharePost);

// Delete and patch (least specific)
router.delete("/:id", authMiddleware, deletePost);
router.patch("/:id", authMiddleware, updatePost);

module.exports = router;

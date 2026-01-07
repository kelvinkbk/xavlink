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

// Basic CRUD
router.post("/create", authMiddleware, createPost);
router.get("/all", optionalAuthMiddleware, getAllPosts);
router.post("/:id/like", authMiddleware, likePost);
router.delete("/:id/like", authMiddleware, unlikePost);
router.post("/:id/comments", authMiddleware, addComment);
router.get("/:id/comments", getComments);
router.delete("/:id", authMiddleware, deletePost);
router.patch("/:id", authMiddleware, updatePost);
router.patch("/comments/:commentId", authMiddleware, updateComment);
router.delete("/comments/:commentId", authMiddleware, deleteComment);

// Bookmark routes
router.post("/:id/bookmark", authMiddleware, bookmarkPost);
router.delete("/:id/bookmark", authMiddleware, unbookmarkPost);
router.get("/bookmarks", authMiddleware, getBookmarkedPosts);

// Reaction routes
router.post("/:id/reaction", authMiddleware, addReaction);
router.delete("/:id/reaction", authMiddleware, removeReaction);

// === NEW FEATURE ROUTES ===

// 1. Search
router.get("/search", optionalAuthMiddleware, searchPosts);

// 2. Trending & Tags
router.get("/trending/topics", getTrendingTopics);
router.get("/tags/:tag", optionalAuthMiddleware, getPostsByTag);

// 3. Draft management
router.post("/drafts/create", authMiddleware, createDraft);
router.get("/drafts", authMiddleware, getDrafts);
router.patch("/drafts/:draftId", authMiddleware, updateDraft);
router.post("/drafts/:draftId/publish", authMiddleware, publishDraft);
router.delete("/drafts/:draftId", authMiddleware, deleteDraft);

// 4. Pin posts
router.post("/:id/pin", authMiddleware, pinPost);
router.delete("/:id/pin", authMiddleware, unpinPost);

// 5. View tracking
router.post("/:id/view", optionalAuthMiddleware, trackPostView);

// 6. Analytics
router.get("/:id/analytics", authMiddleware, getPostAnalytics);

// 7. Share posts
router.post("/:id/share", authMiddleware, sharePost);

// 8. Suggested users
router.get("/users/suggested", authMiddleware, getSuggestedUsers);

// 9. Keyword mute
router.post("/mute-keywords", authMiddleware, addKeywordMute);
router.delete("/mute-keywords/:muteId", authMiddleware, removeKeywordMute);
router.get("/mute-keywords", authMiddleware, getMutedKeywords);

module.exports = router;

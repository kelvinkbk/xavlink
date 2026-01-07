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
} = require("../controllers/postController");
const authMiddleware = require("../middleware/authMiddleware");
const { optionalAuthMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

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

module.exports = router;

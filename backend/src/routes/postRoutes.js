const express = require("express");
const {
  createPost,
  getAllPosts,
  likePost,
  unlikePost,
  addComment,
  getComments,
  deletePost,
} = require("../controllers/postController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create", authMiddleware, createPost);
router.get("/all", getAllPosts);
router.post("/:id/like", authMiddleware, likePost);
router.delete("/:id/like", authMiddleware, unlikePost);
router.post("/:id/comments", authMiddleware, addComment);
router.get("/:id/comments", getComments);
router.delete("/:id", authMiddleware, deletePost);

module.exports = router;

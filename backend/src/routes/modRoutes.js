const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  listUsers,
  setSuspended,
  editPost,
  deletePost,
  listComments,
  deleteComment,
  deleteUserReview,
  deletePostReview,
} = require("../controllers/moderationController");

const router = express.Router();

// Allow both admin and moderator
router.use(authMiddleware, requireRole(["admin", "moderator"]));

router.get("/users", listUsers);
router.patch("/users/:id/suspend", setSuspended);

router.get("/comments", listComments);
router.patch("/posts/:id", editPost);
router.delete("/posts/:id", deletePost);
router.delete("/comments/:id", deleteComment);
router.delete("/reviews/user/:id", deleteUserReview);
router.delete("/reviews/post/:id", deletePostReview);

module.exports = router;

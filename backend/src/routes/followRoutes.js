const express = require("express");
const {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowStatus,
} = require("../controllers/followController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/:id/follow", authMiddleware, followUser);
router.delete("/:id/follow", authMiddleware, unfollowUser);
router.get("/:id/followers", getFollowers);
router.get("/:id/following", getFollowing);
router.get("/:id/follow-status", authMiddleware, getFollowStatus);

module.exports = router;

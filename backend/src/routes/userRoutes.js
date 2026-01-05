const express = require("express");
const {
  getProfile,
  searchUsers,
  getSuggestedUsers,
  updateProfile,
} = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Specific routes MUST come before /:id to avoid route collision
router.get("/search", searchUsers);
router.get("/suggested", authMiddleware, getSuggestedUsers);
// Wildcard routes last
router.get("/:id", getProfile);
router.put("/:id", authMiddleware, updateProfile);

module.exports = router;

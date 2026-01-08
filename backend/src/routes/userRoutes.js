const express = require("express");
const {
  getProfile,
  searchUsers,
  getSuggestedUsers,
  getMutualConnections,
  getSkillBasedSuggestions,
  updateProfile,
} = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Specific routes MUST come before /:id to avoid route collision
router.get("/search", searchUsers);
router.get("/suggested", authMiddleware, getSuggestedUsers);
router.get("/connections/mutual", authMiddleware, getMutualConnections);
router.get("/suggestions/skills", authMiddleware, getSkillBasedSuggestions);
router.get("/blocked", authMiddleware, (req, res) => {
  // Return empty array for now (block feature not fully implemented)
  res.json([]);
});
router.post("/blocked", authMiddleware, (req, res) => {
  // Block user - not fully implemented
  res.status(200).json({ message: "User blocked" });
});
router.delete("/blocked/:blockedId", authMiddleware, (req, res) => {
  // Unblock user - not fully implemented
  res.status(200).json({ message: "User unblocked" });
});
// Wildcard routes last
router.get("/:id", getProfile);
router.put("/:id", authMiddleware, updateProfile);

module.exports = router;

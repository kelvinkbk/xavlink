const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  // Discover
  filterUsersByCourseAndSkills,
  getTrendingSkills,
  addToFavorites,
  removeFromFavorites,
  getFavorites,
  // Profile
  trackProfileView,
  getProfileStats,
  updateSocialLinks,
  addUserPhoto,
  getUserPhotos,
  deleteUserPhoto,
  getAchievements,
  // Skills
  endorseSkill,
  removeEndorsement,
  getMostEndorsedSkills,
  addCertification,
  getSkillCertifications,
  getSkillRecommendations,
  // Requests
  createRequestTemplate,
  getRequestTemplates,
  deleteRequestTemplate,
  getRequestHistory,
  sendCounterOffer,
  completeRequest,
  // Notifications
  getGroupedNotifications,
  pinNotification,
  archiveNotification,
  getArchivedNotifications,
  // Moderation
  addModNote,
  getModNotes,
  getModerationDashboard,
  // Admin
  getAnalyticsDashboard,
  getSystemHealth,
  // Device Management
  getDeviceSessions,
  revokeDeviceSession,
  revokeAllOtherSessions,
} = require("../controllers/enhancementController");

const router = express.Router();

// Discover enhancements
router.get("/discover/filter", filterUsersByCourseAndSkills);
router.get("/discover/trending-skills", getTrendingSkills);
router.post("/discover/favorites", authMiddleware, addToFavorites);
router.delete("/discover/favorites/:favoriteUserId", authMiddleware, removeFromFavorites);
router.get("/discover/favorites", authMiddleware, getFavorites);

// Profile enhancements
router.post("/profile/:userId/view", trackProfileView);
router.get("/profile/:userId/stats", getProfileStats);
router.put("/profile/social-links", authMiddleware, updateSocialLinks);
router.post("/profile/photos", authMiddleware, addUserPhoto);
router.get("/profile/:userId/photos", getUserPhotos);
router.delete("/profile/photos/:photoId", authMiddleware, deleteUserPhoto);
router.get("/profile/:userId/achievements", getAchievements);

// Skills enhancements
router.post("/skills/:skillId/endorse", authMiddleware, endorseSkill);
router.delete("/skills/:skillId/endorse", authMiddleware, removeEndorsement);
router.get("/skills/trending/endorsed", getMostEndorsedSkills);
router.post("/skills/:skillId/certifications", authMiddleware, addCertification);
router.get("/skills/:skillId/certifications", getSkillCertifications);
router.get("/skills/recommendations", authMiddleware, getSkillRecommendations);

// Requests enhancements
router.post("/requests/templates", authMiddleware, createRequestTemplate);
router.get("/requests/templates", authMiddleware, getRequestTemplates);
router.delete("/requests/templates/:templateId", authMiddleware, deleteRequestTemplate);
router.get("/requests/history", authMiddleware, getRequestHistory);
router.post("/requests/:requestId/counter-offer", authMiddleware, sendCounterOffer);
router.post("/requests/:requestId/complete", authMiddleware, completeRequest);

// Notifications enhancements
router.get("/notifications/grouped", authMiddleware, getGroupedNotifications);
router.post("/notifications/:notificationId/pin", authMiddleware, pinNotification);
router.post("/notifications/:notificationId/archive", authMiddleware, archiveNotification);
router.get("/notifications/archived", authMiddleware, getArchivedNotifications);

// Moderation enhancements
router.post("/moderation/reports/:reportId/notes", authMiddleware, addModNote);
router.get("/moderation/reports/:reportId/notes", authMiddleware, getModNotes);
router.get("/moderation/dashboard", authMiddleware, getModerationDashboard);

// Admin enhancements
router.get("/admin/analytics", authMiddleware, getAnalyticsDashboard);
router.get("/admin/health", authMiddleware, getSystemHealth);

// Device management
router.get("/devices/sessions", authMiddleware, getDeviceSessions);
router.delete("/devices/sessions/:sessionId", authMiddleware, revokeDeviceSession);
router.post("/devices/sessions/revoke-all", authMiddleware, revokeAllOtherSessions);

module.exports = router;

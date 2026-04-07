const express = require("express");
const {
  getSettings,
  updateSettings,
  getMySettings,
  updateMySettings,
  changePassword,
  changeEmail,
  deleteAccount,
  updateProfile,
} = require("../controllers/settingsController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", authMiddleware, getMySettings);
router.put("/me", authMiddleware, updateMySettings);

router.get("/:userId", authMiddleware, getSettings);
router.put("/:userId", authMiddleware, updateSettings);
router.post("/:userId/change-password", authMiddleware, changePassword);
router.post("/:userId/change-email", authMiddleware, changeEmail);
router.post("/:userId/update-profile", authMiddleware, updateProfile);
router.delete("/:userId", authMiddleware, deleteAccount);

module.exports = router;

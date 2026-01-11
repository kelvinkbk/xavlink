const express = require("express");
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  verifyTwoFactorToken,
} = require("../controllers/authController");
const { authLimiter } = require("../middleware/securityMiddleware");

const router = express.Router();

// Apply stricter rate limiting to authentication endpoints
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/verify-2fa", authLimiter, verifyTwoFactorToken);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", authLimiter, resendVerification);

module.exports = router;

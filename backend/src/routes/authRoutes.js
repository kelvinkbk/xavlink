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
const {
  authLimiter,
  passwordResetLimiter,
} = require("../middleware/rateLimiter");

const router = express.Router();

// Apply stricter rate limiting to authentication endpoints
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/verify-2fa", authLimiter, verifyTwoFactorToken);
router.post("/forgot-password", passwordResetLimiter, forgotPassword);
router.post("/reset-password", passwordResetLimiter, resetPassword);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", authLimiter, resendVerification);

module.exports = router;

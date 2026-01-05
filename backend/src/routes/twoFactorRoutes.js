const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  generateTwoFactorSecret,
  enableTwoFactor,
  disableTwoFactor,
} = require("../controllers/twoFactorController");

const router = express.Router();

router.use(authMiddleware);

router.post("/generate", generateTwoFactorSecret);
router.post("/enable", enableTwoFactor);
router.post("/disable", disableTwoFactor);

module.exports = router;

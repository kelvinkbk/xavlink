const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  profileUpload,
  postUpload,
  chatUpload,
} = require("../middleware/uploadMiddleware");
const {
  uploadProfilePic,
  uploadPostImage,
  uploadChatAttachment,
} = require("../controllers/uploadController");
const { uploadLimiter } = require("../middleware/securityMiddleware");

const router = express.Router();

// Upload profile picture for current user
router.post(
  "/profile-pic",
  authMiddleware,
  uploadLimiter,
  profileUpload.single("image"),
  uploadProfilePic
);

// Upload post image, returns a URL for client to use in createPost
router.post(
  "/post-image",
  authMiddleware,
  uploadLimiter,
  postUpload.single("image"),
  uploadPostImage
);

// Upload chat attachment (images, files), returns a URL for client to include in message
router.post(
  "/chat-attachment",
  authMiddleware,
  uploadLimiter,
  chatUpload.single("file"),
  uploadChatAttachment
);

module.exports = router;

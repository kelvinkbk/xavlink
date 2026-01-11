const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  upload,
  chatUpload,
  setUploadFolder,
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
  setUploadFolder("profile"),
  upload.single("image"),
  uploadProfilePic
);

// Upload post image, returns a URL for client to use in createPost
router.post(
  "/post-image",
  authMiddleware,
  uploadLimiter,
  setUploadFolder("posts"),
  upload.single("image"),
  uploadPostImage
);

// Upload chat attachment (images, files), returns a URL for client to include in message
router.post(
  "/chat-attachment",
  authMiddleware,
  uploadLimiter,
  setUploadFolder("chats"),
  chatUpload.single("file"),
  uploadChatAttachment
);

module.exports = router;

const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { upload, setUploadFolder } = require("../middleware/uploadMiddleware");
const {
  uploadProfilePic,
  uploadPostImage,
  uploadChatAttachment,
} = require("../controllers/uploadController");

const router = express.Router();

// Upload profile picture for current user
router.post(
  "/profile-pic",
  authMiddleware,
  setUploadFolder("profile"),
  upload.single("image"),
  uploadProfilePic
);

// Upload post image, returns a URL for client to use in createPost
router.post(
  "/post-image",
  authMiddleware,
  setUploadFolder("posts"),
  upload.single("image"),
  uploadPostImage
);

// Upload chat attachment (images, files), returns a URL for client to include in message
router.post(
  "/chat-attachment",
  authMiddleware,
  setUploadFolder("chats"),
  upload.single("file"),
  uploadChatAttachment
);

module.exports = router;

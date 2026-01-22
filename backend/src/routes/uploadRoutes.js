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
const { uploadLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// Upload profile picture for current user
router.post(
  "/profile-pic",
  authMiddleware,
  uploadLimiter,
  (req, res, next) => {
    profileUpload.single("image")(req, res, (err) => {
      if (err) {
        console.error("❌ Multer/Cloudinary upload error:", err);
        return res.status(400).json({ 
          message: "File upload failed", 
          error: err.message 
        });
      }
      console.log("📤 Multer completed. File details:", {
        hasFile: !!req.file,
        filename: req.file?.filename,
        originalname: req.file?.originalname,
        path: req.file?.path,
        size: req.file?.size,
        mimetype: req.file?.mimetype,
        fieldname: req.file?.fieldname,
      });
      next();
    });
  },
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

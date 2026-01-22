const multer = require("multer");
const path = require("path");
const {
  profileStorage,
  chatStorage,
  postStorage,
} = require("../config/cloudinary");

const imageFileFilter = (req, file, cb) => {
  const allowed = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".heic", ".heif"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    const err = new Error("Only image files are allowed");
    err.status = 400;
    return cb(err);
  }
  cb(null, true);
};

// File filter for chat attachments (more permissive)
const chatFileFilter = (req, file, cb) => {
  const allowed = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".heic",
    ".heif", // Images
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx", // Documents
    ".mp3",
    ".wav",
    ".mp4",
    ".mov",
    ".avi", // Media
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    const err = new Error("File type not allowed");
    err.status = 400;
    return cb(err);
  }
  cb(null, true);
};

// Profile picture upload (using Cloudinary)
const profileUpload = multer({
  storage: profileStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});
// Add error handler
const handleUploadError = (err, req, res, next) => {
  console.error("❌ Multer upload error:", err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message, code: err.code });
  }
  next(err);
};

// Post image upload (using Cloudinary)
const postUpload = multer({
  storage: postStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// Chat upload (using Cloudinary, more permissive file types, 10 MB limit)
const chatUpload = multer({
  storage: chatStorage,
  fileFilter: chatFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

module.exports = {
  profileUpload,
  postUpload,
  chatUpload,
  // Keep legacy exports for backward compatibility
  upload: profileUpload,
  setUploadFolder: (folder) => (req, _res, next) => {
    req.uploadFolder = folder;
    next();
  },
};

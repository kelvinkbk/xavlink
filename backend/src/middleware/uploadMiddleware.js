const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_ROOT = path.join(__dirname, "..", "..", "uploads");

// Ensure base upload directory exists
if (!fs.existsSync(UPLOAD_ROOT)) {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Separate folders for profile pics and post images
    const folder = req.uploadFolder || "misc";
    const dest = path.join(UPLOAD_ROOT, folder);
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 50);
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${base}-${unique}${ext}`);
  },
});

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
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".heic", ".heif", // Images
    ".pdf", ".doc", ".docx", ".txt", ".xls", ".xlsx", ".ppt", ".pptx", // Documents
    ".mp3", ".wav", ".mp4", ".mov", ".avi", // Media
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    const err = new Error("File type not allowed");
    err.status = 400;
    return cb(err);
  }
  cb(null, true);
};

// 5 MB default limit
const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Chat upload (more permissive file types, 10 MB limit)
const chatUpload = multer({
  storage,
  fileFilter: chatFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = {
  upload,
  chatUpload,
  setUploadFolder: (folder) => (req, _res, next) => {
    req.uploadFolder = folder;
    next();
  },
};

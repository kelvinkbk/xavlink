const prisma = require("../config/prismaClient");

exports.uploadProfilePic = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    // Log basic file info to aid troubleshooting upload errors
    console.info("profile upload", {
      userId: req.user?.id,
      originalname: req.file.originalname,
      size: req.file.size,
      path: req.file.path,
      cloudinaryId: req.file.filename,
    });
    const userId = req.user.id;
    // Cloudinary URL is available in req.file.path
    const publicUrl = req.file.path;

    if (!publicUrl) {
      console.error("❌ Cloudinary upload failed - no URL returned");
      return res.status(500).json({ 
        message: "File upload failed - no URL generated",
        details: "Cloudinary may not be configured properly"
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { profilePic: publicUrl },
      select: { id: true, name: true, email: true, profilePic: true },
    });

    console.log("✅ Profile picture uploaded successfully:", publicUrl);
    return res.status(201).json({ url: publicUrl, user });
  } catch (err) {
    console.error("❌ Profile picture upload error:", err.message);
    next(err);
  }
};

exports.uploadPostImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    console.info("post image upload", {
      userId: req.user?.id,
      originalname: req.file.originalname,
      size: req.file.size,
    });
    // Cloudinary URL is available in req.file.path
    const publicUrl = req.file.path;
    return res.status(201).json({ url: publicUrl });
  } catch (err) {
    next(err);
  }
};

exports.uploadChatAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    console.info("chat attachment upload", {
      userId: req.user?.id,
      originalname: req.file.originalname,
      size: req.file.size,
    });
    // Cloudinary URL is available in req.file.path
    const publicUrl = req.file.path;
    return res.status(201).json({ url: publicUrl });
  } catch (err) {
    next(err);
  }
};

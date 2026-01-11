const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for profile pictures
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "xavlink/profile",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 500, height: 500, crop: "limit" }],
  },
});

// Storage for chat attachments
const chatStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "xavlink/chats",
    allowed_formats: [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "pdf",
      "doc",
      "docx",
    ],
    resource_type: "auto", // Automatically detect file type
  },
});

// Storage for post images
const postStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "xavlink/posts",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
  },
});

module.exports = {
  cloudinary,
  profileStorage,
  chatStorage,
  postStorage,
};

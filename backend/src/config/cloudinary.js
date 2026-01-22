const cloudinary = require("cloudinary");
const CloudinaryStorage = require("multer-storage-cloudinary");
// Configure Cloudinary v2
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Log configuration status (without exposing secrets)
console.log("🔧 Cloudinary Configuration:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? "✅ Set" : "❌ Missing",
  api_key: process.env.CLOUDINARY_API_KEY ? "✅ Set" : "❌ Missing",
  api_secret: process.env.CLOUDINARY_API_SECRET ? "✅ Set" : "❌ Missing",
});

// Storage for profile pictures
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "xavlink/profile",
  },
});

// Storage for chat attachments
const chatStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "xavlink/chats",
    resource_type: "auto",
  },
});
// Storage for post images
const postStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "xavlink/posts",
  },
});

module.exports = {
  cloudinary: cloudinary.v2,
  profileStorage,
  chatStorage,
  postStorage,
};

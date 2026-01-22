const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");
// Configure Cloudinary v2
cloudinary.config({
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
// Custom multer storage engine for Cloudinary v2
class CloudinaryStorage {
  constructor(opts) {
    this.cloudinary = cloudinary;
    this.params = opts.params || {};
  }
  _handleFile(req, file, cb) {
    const folder = this.params.folder || "uploads";
    const resource_type = this.params.resource_type || "auto";
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type,
      },
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary upload_stream error:", error);
          return cb(error);
        }
        console.log("✅ Cloudinary upload successful:", {
          public_id: result.public_id,
          url: result.secure_url,
        });
        cb(null, {
          path: result.secure_url,
          filename: result.public_id,
          size: result.bytes,
          format: result.format,
        });
      }
    );
    file.stream.pipe(uploadStream);
  }
  _removeFile(req, file, cb) {
    cloudinary.uploader.destroy(file.filename, cb);
  }
}
// Storage for profile pictures
const profileStorage = new CloudinaryStorage({
  params: {
    folder: "xavlink/profile",
  },
});
// Storage for chat attachments
const chatStorage = new CloudinaryStorage({
  params: {
    folder: "xavlink/chats",
    resource_type: "auto",
  },
});
// Storage for post images
const postStorage = new CloudinaryStorage({
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

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

/* =========================
   CLOUDINARY CONFIG
========================= */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/* =========================
   CLOUDINARY STORAGE
   Files go directly to Cloudinary
   — survives Render redeploys
========================= */
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // Determine if it's a video or image
    const isVideo = file.mimetype.startsWith("video/");
    return {
      folder: "voxaria",
      resource_type: isVideo ? "video" : "image",
      allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "mp4", "mov", "webm"],
      transformation: isVideo
        ? []
        : [{ width: 1200, crop: "limit", fetch_format: "auto", quality: "auto" }]
    };
  }
});

const upload = multer({ storage });

module.exports = upload;
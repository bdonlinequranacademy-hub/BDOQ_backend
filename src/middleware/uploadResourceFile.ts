import multer from "multer";

const MAX_IMAGE_RESOURCE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_RESOURCE_BYTES = 100 * 1024 * 1024;

const storage = multer.memoryStorage();

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/x-m4a",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/mpeg",
  "video/ogg",
  "video/x-matroska",
]);

export const uploadResourceFile = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_RESOURCE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype) || file.mimetype.startsWith("video/")) {
      cb(null, true);
      return;
    }
    cb(new Error("INVALID_FILE_TYPE"));
  },
}).single("file");

export { MAX_IMAGE_RESOURCE_BYTES, MAX_VIDEO_RESOURCE_BYTES };

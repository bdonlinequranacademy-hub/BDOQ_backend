import multer from "multer";

const MAX_RESOURCE_BYTES = 15 * 1024 * 1024;

const storage = multer.memoryStorage();

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const uploadResourceFile = multer({
  storage,
  limits: { fileSize: MAX_RESOURCE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("INVALID_FILE_TYPE"));
  },
}).single("file");

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_VIDEO_RESOURCE_BYTES = exports.MAX_IMAGE_RESOURCE_BYTES = exports.uploadResourceFile = void 0;
const multer_1 = __importDefault(require("multer"));
const MAX_IMAGE_RESOURCE_BYTES = 15 * 1024 * 1024;
exports.MAX_IMAGE_RESOURCE_BYTES = MAX_IMAGE_RESOURCE_BYTES;
const MAX_VIDEO_RESOURCE_BYTES = 100 * 1024 * 1024;
exports.MAX_VIDEO_RESOURCE_BYTES = MAX_VIDEO_RESOURCE_BYTES;
const storage = multer_1.default.memoryStorage();
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
exports.uploadResourceFile = (0, multer_1.default)({
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

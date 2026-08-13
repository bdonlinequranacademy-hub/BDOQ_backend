import multer from "multer";

export const teacherApplicationUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 4 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
}).fields([
  { name: "certificateFile", maxCount: 1 },
  { name: "cvFile", maxCount: 1 },
  { name: "profilePhotoFile", maxCount: 1 },
  { name: "screenshotFile", maxCount: 1 },
]);

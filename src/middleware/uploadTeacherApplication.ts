import multer from "multer";

export const teacherApplicationUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 4 },
  fileFilter: (_req, file, cb) => {
    const allowed =
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");

    if (!allowed) {
      cb(new Error("Only PDF and image files are allowed"));
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

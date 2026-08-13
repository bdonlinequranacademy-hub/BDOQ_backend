import multer from "multer";

export const studentAdmissionUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 2 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
}).fields([
  { name: "admissionPaymentProof", maxCount: 1 },
  { name: "monthlyTuitionProof", maxCount: 1 },
]);

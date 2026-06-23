import { Router } from "express";
import { auth, checkRole } from "../middleware/auth";
import {
  getClassById,
  getMyAttendance,
  getMyClasses,
  getMyHomework,
  getMyNotifications,
  getMyProgress,
  getMyCurriculumPlan,
  getTodaySchedule,
  markAsRead,
  submitHomework,
} from "../controllers/studentController";
import { getStudentWeeklyReport } from "../controllers/weeklyReportController";
import {
  changeStudentPassword,
  getStudentProfile,
  updateStudentProfile,
} from "../controllers/studentProfileController";
import { paymentProofUpload } from "../middleware/uploadPaymentProof";
import {
  getStudentPaymentStatus,
  listStudentPayments,
  submitStudentPayment,
} from "../controllers/paymentController";

const router = Router();

router.use(auth, checkRole("student"));

router.get("/classes", getMyClasses);
router.get("/schedule/today", getTodaySchedule);
router.get("/classes/:id", getClassById);
router.get("/homework", getMyHomework);
router.post("/homework/:id/submit", submitHomework);
router.get("/attendance", getMyAttendance);
router.get("/progress", getMyProgress);
router.get("/curriculum-plan", getMyCurriculumPlan);
router.get("/weekly-report", getStudentWeeklyReport);
router.get("/notifications", getMyNotifications);
router.patch("/notifications/:id/read", markAsRead);
router.get("/profile", getStudentProfile);
router.patch("/profile", updateStudentProfile);
router.patch("/profile/password", changeStudentPassword);

router.get("/payments/status", getStudentPaymentStatus);
router.get("/payments", listStudentPayments);
router.post("/payments", (req, res, next) => {
  paymentProofUpload(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      res.status(400).json({ success: false, message, data: null });
      return;
    }
    next();
  });
}, submitStudentPayment);

export default router;

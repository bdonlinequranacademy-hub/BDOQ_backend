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
import { recordStudentSessionJoin } from "../controllers/sessionJoinController";
import { getStudentWeeklyReport } from "../controllers/weeklyReportController";
import {
  changeStudentPassword,
  getStudentProfile,
  getStudentProfileHub,
  updateStudentProfile,
  updateMyApplicationData,
} from "../controllers/studentProfileController";
import { uploadProfileAvatar } from "../controllers/avatarController";
import { avatarUpload } from "../middleware/uploadAvatar";
import { paymentProofUpload } from "../middleware/uploadPaymentProof";
import {
  getStudentPaymentStatus,
  listStudentPayments,
  submitStudentPayment,
  getStudentPaymentInvoice,
} from "../controllers/paymentController";
import {
  listMyOptionalPayments,
  submitPortalOptionalPayment,
} from "../controllers/optionalPaymentController";

const router = Router();

router.use(auth, checkRole("student"));

router.get("/classes", getMyClasses);
router.get("/schedule/today", getTodaySchedule);
router.post("/session/join/:slotId", recordStudentSessionJoin);
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
router.get("/profile/hub", getStudentProfileHub);
router.patch("/profile", updateStudentProfile);
router.put("/profile/application-data", updateMyApplicationData);
router.patch("/profile/password", changeStudentPassword);
router.post("/profile/avatar", (req, res, next) => {
  avatarUpload(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      res.status(400).json({ success: false, message, data: null });
      return;
    }
    next();
  });
}, uploadProfileAvatar);

router.get("/payments/status", getStudentPaymentStatus);
router.get("/payments", listStudentPayments);
router.get("/payments/:id/invoice", getStudentPaymentInvoice);
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

router.get("/optional-payments", listMyOptionalPayments);
router.post(
  "/optional-payments",
  (req, res, next) => {
    paymentProofUpload(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        res.status(400).json({ success: false, message, data: null });
        return;
      }
      next();
    });
  },
  submitPortalOptionalPayment
);

export default router;

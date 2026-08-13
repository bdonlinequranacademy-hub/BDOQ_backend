import { Router } from "express";
import { auth, checkRole } from "../middleware/auth";
import {
  createHomework,
  updateHomework,
  deleteHomework,
  getAttendanceReport,
  getClassAttendanceForDate,
  getClassById,
  getClassHomework,
  getHomeworkDetail,
  getMyClasses,
  getMyNotifications,
  getMyStudents,
  getStudentProgress,
  getTodaySchedule,
  getWeeklyRoutine,
  gradeSubmission,
  reviewHomeworkSubmission,
  markAttendance,
  markNotificationRead,
  toggleStudentCurriculumComplete,
  updateProgress,
} from "../controllers/teacherController";
import {
  createTeacherClassLog,
  getTeacherClassLog,
  getTeacherClassLogStats,
  listTeacherClassLogs,
} from "../controllers/classLogController";
import { getTeacherEarningsReport } from "../controllers/earningsController";
import {
  changeTeacherPassword,
  checkAvailability,
  getTeacherProfile,
  updateTeacherProfile,
} from "../controllers/teacherProfileController";
import { uploadProfileAvatar } from "../controllers/avatarController";
import { avatarUpload } from "../middleware/uploadAvatar";
import {
  createTeacherStudentRequest,
  listTeacherStudentRequestsHandler,
} from "../controllers/studentRequestController";
import { scanTextHandler } from "../controllers/complianceController";
import { getTeacherWeeklyReport } from "../controllers/weeklyReportController";
import { recordTeacherSessionJoin } from "../controllers/sessionJoinController";
import { paymentProofUpload } from "../middleware/uploadPaymentProof";
import {
  listMyOptionalPayments,
  submitPortalOptionalPayment,
} from "../controllers/optionalPaymentController";

const router = Router();

router.use(auth, checkRole("teacher"));

router.get("/students", getMyStudents);
router.get("/students/:studentId/progress", getStudentProgress);
router.patch("/students/:studentId/curriculum-complete", toggleStudentCurriculumComplete);
router.get("/classes", getMyClasses);
router.get("/classes/:id", getClassById);
router.get("/schedule/today", getTodaySchedule);
router.get("/schedule/routine", getWeeklyRoutine);
router.post("/session/join/:slotId", recordTeacherSessionJoin);
router.post("/attendance", markAttendance);
router.get("/attendance", getClassAttendanceForDate);
router.post("/compliance-scan", scanTextHandler);
router.get("/weekly-report", getTeacherWeeklyReport);
router.put("/homework/:id", updateHomework);
router.delete("/homework/:id", deleteHomework);
router.post("/homework", createHomework);
router.get("/homework", getClassHomework);
router.get("/homework/:id", getHomeworkDetail);
router.post("/homework/:id/grade", gradeSubmission);
router.post("/homework/:id/review", reviewHomeworkSubmission);
router.put("/progress", updateProgress);
router.get("/attendance-report", getAttendanceReport);
router.get("/notifications", getMyNotifications);
router.patch("/notifications/:id/read", markNotificationRead);
router.get("/class-logs/stats", getTeacherClassLogStats);
router.get("/class-logs", listTeacherClassLogs);
router.get("/class-logs/:id", getTeacherClassLog);
router.post("/class-logs", createTeacherClassLog);
router.get("/earnings", getTeacherEarningsReport);
router.get("/profile", getTeacherProfile);
router.patch("/profile", updateTeacherProfile);
router.patch("/profile/password", changeTeacherPassword);
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
router.post("/availability/check", checkAvailability);
router.get("/student-requests", listTeacherStudentRequestsHandler);
router.post("/student-requests", createTeacherStudentRequest);

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

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
  createTeacherMonthlyProgress,
  getMonthlyQuestions,
  listTeacherMonthlyProgressHandler,
} from "../controllers/monthlyProgressController";
import {
  changeTeacherPassword,
  checkAvailability,
  getTeacherProfile,
  updateTeacherProfile,
} from "../controllers/teacherProfileController";
import {
  createTeacherStudentRequest,
  listTeacherStudentRequestsHandler,
} from "../controllers/studentRequestController";
import {
  createConcernReport,
  scanTextHandler,
} from "../controllers/concernReportController";
import { getTeacherWeeklyReport } from "../controllers/weeklyReportController";

const router = Router();

router.use(auth, checkRole("teacher"));

router.get("/students", getMyStudents);
router.get("/students/:studentId/progress", getStudentProgress);
router.patch("/students/:studentId/curriculum-complete", toggleStudentCurriculumComplete);
router.get("/classes", getMyClasses);
router.get("/classes/:id", getClassById);
router.get("/schedule/today", getTodaySchedule);
router.get("/schedule/routine", getWeeklyRoutine);
router.post("/attendance", markAttendance);
router.get("/attendance", getClassAttendanceForDate);
router.post("/concern-reports", createConcernReport);
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
router.get("/monthly-progress/questions", getMonthlyQuestions);
router.get("/monthly-progress", listTeacherMonthlyProgressHandler);
router.post("/monthly-progress", createTeacherMonthlyProgress);
router.get("/profile", getTeacherProfile);
router.patch("/profile", updateTeacherProfile);
router.patch("/profile/password", changeTeacherPassword);
router.post("/availability/check", checkAvailability);
router.get("/student-requests", listTeacherStudentRequestsHandler);
router.post("/student-requests", createTeacherStudentRequest);

export default router;

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
import { listStudentMonthlyProgressHandler } from "../controllers/monthlyProgressController";
import { getStudentWeeklyReport } from "../controllers/weeklyReportController";
import { createConcernReport } from "../controllers/concernReportController";
import {
  changeStudentPassword,
  getStudentProfile,
  updateStudentProfile,
} from "../controllers/studentProfileController";

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
router.get("/monthly-progress", listStudentMonthlyProgressHandler);
router.get("/weekly-report", getStudentWeeklyReport);
router.post("/concern-reports", createConcernReport);
router.get("/notifications", getMyNotifications);
router.patch("/notifications/:id/read", markAsRead);
router.get("/profile", getStudentProfile);
router.patch("/profile", updateStudentProfile);
router.patch("/profile/password", changeStudentPassword);

export default router;

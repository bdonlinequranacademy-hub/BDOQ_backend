import { Router } from "express";
import { auth, checkRole } from "../middleware/auth";
import {
  getChildren,
  getChildClasses,
  getChildHomework,
  getChildAttendance,
  getChildProgress,
  getChildTodaySchedule,
  getMyNotifications,
  markNotificationRead,
} from "../controllers/parentController";

const router = Router();

router.use(auth, checkRole("parent"));

router.get("/children", getChildren);
router.get("/child/:id/classes", getChildClasses);
router.get("/child/:id/schedule/today", getChildTodaySchedule);
router.get("/child/:id/homework", getChildHomework);
router.get("/child/:id/attendance", getChildAttendance);
router.get("/child/:id/progress", getChildProgress);
router.get("/notifications", getMyNotifications);
router.patch("/notifications/:id/read", markNotificationRead);

export default router;

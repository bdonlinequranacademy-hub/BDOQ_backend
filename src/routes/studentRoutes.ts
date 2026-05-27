import { Router } from "express";
import { auth, checkRole } from "../middleware/auth";
import {
  getMyAttendance,
  getMyClasses,
  getMyHomework,
  getMyNotifications,
  getMyProgress,
  markAsRead,
} from "../controllers/studentController";

const router = Router();

router.use(auth, checkRole("student"));

router.get("/classes", getMyClasses);
router.get("/homework", getMyHomework);
router.get("/attendance", getMyAttendance);
router.get("/progress", getMyProgress);
router.get("/notifications", getMyNotifications);
router.patch("/notifications/:id/read", markAsRead);

export default router;

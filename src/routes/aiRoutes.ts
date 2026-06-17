import { Router } from "express";
import { auth, checkRole } from "../middleware/auth";
import { getAtRiskStudents } from "../controllers/studentCareController";

const router = Router();

/** Rule-based student care alerts (no generative AI). */
router.get(
  "/at-risk-students",
  auth,
  checkRole("admin", "super_admin", "teacher"),
  getAtRiskStudents
);

export default router;

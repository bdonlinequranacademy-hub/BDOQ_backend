import { Router } from "express";
import { auth, checkRole } from "../middleware/auth";
import {
  generateParentSummary,
  generateProgressReport,
  generateStudyPlan,
  generateClassLogDraftHandler,
  generateEarlyWarningHandler,
  getAtRiskStudents,
} from "../controllers/aiController";

const router = Router();

router.post(
  "/parent-summary",
  auth,
  checkRole("admin", "teacher", "parent", "student"),
  generateParentSummary
);

router.get(
  "/at-risk-students",
  auth,
  checkRole("admin", "teacher"),
  getAtRiskStudents
);

router.post(
  "/early-warning",
  auth,
  checkRole("admin", "teacher"),
  generateEarlyWarningHandler
);

router.post(
  "/progress-report",
  auth,
  checkRole("admin", "teacher"),
  generateProgressReport
);

router.post(
  "/study-plan",
  auth,
  checkRole("admin", "teacher", "student"),
  generateStudyPlan
);

router.post(
  "/class-log-draft",
  auth,
  checkRole("admin", "teacher"),
  generateClassLogDraftHandler
);

export default router;

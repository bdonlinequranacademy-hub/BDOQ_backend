import { Router } from "express";
import { auth, checkRole } from "../middleware/auth";
import {
  assignStudentToClass,
  createClass,
  createUser,
  deleteClass,
  deleteUser,
  getAllClasses,
  getAllHomework,
  deleteAdminHomework,
  getAllProgress,
  getAllUsers,
  getAttendanceOverview,
  getClassById,
  getDashboardStats,
  getUserById,
  removeStudentFromClass,
  updateClass,
  updateUser,
} from "../controllers/adminController";
import {
  adminCreateBlogPost,
  adminDeleteBlogPost,
  adminGetBlogPostById,
  adminGetBlogPosts,
  adminUpdateBlogPost,
} from "../controllers/adminBlogController";
import {
  approveAdminClassLog,
  listAdminClassLogs,
  rejectAdminClassLog,
} from "../controllers/classLogController";
import { getAdminEarningsReport } from "../controllers/earningsController";
import {
  approveStudentRequest,
  listAdminStudentRequestsHandler,
  rejectStudentRequest,
} from "../controllers/studentRequestController";
import { listAdminTrialBookings, patchAdminTrialBookingStatus } from "../controllers/trialBookingController";
import {
  listAdminContactMessages,
  patchAdminContactMessageStatus,
} from "../controllers/contactMessageController";
import {
  getAdminCurriculumTree,
  resetAdminCurriculumTree,
  updateAdminCurriculumTree,
} from "../controllers/curriculumAdminController";
import {
  getAdminWeeklyRoutine,
  resyncAdminSchedule,
} from "../controllers/adminScheduleController";
import {
  approvePayment,
  getStudentBilling,
  listAdminPayments,
  listOverdueBillings,
  rejectPayment,
  upsertStudentBilling,
} from "../controllers/paymentController";

const router = Router();

router.use(auth, checkRole("admin", "super_admin"));

router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

router.get("/payments", listAdminPayments);
router.get("/payments/overdue", listOverdueBillings);
router.patch("/payments/:id/approve", approvePayment);
router.patch("/payments/:id/reject", rejectPayment);
router.get("/students/:studentId/billing", getStudentBilling);
router.put("/students/:studentId/billing", upsertStudentBilling);

router.get("/stats", getDashboardStats);
router.get("/homework", getAllHomework);
router.delete("/homework/:id", deleteAdminHomework);
router.get("/attendance", getAttendanceOverview);
router.get("/progress", getAllProgress);

router.get("/classes", getAllClasses);
router.get("/classes/:id", getClassById);
router.post("/classes", createClass);
router.put("/classes/:id", updateClass);
router.post("/classes/:classId/assign", assignStudentToClass);
router.delete(
  "/classes/:classId/remove/:studentId",
  removeStudentFromClass
);
router.delete("/classes/:id", deleteClass);

router.get("/class-logs", listAdminClassLogs);
router.patch("/class-logs/:id/approve", approveAdminClassLog);
router.patch("/class-logs/:id/reject", rejectAdminClassLog);
router.get("/earnings", getAdminEarningsReport);
router.get("/student-requests", listAdminStudentRequestsHandler);
router.patch("/student-requests/:id/approve", approveStudentRequest);
router.patch("/student-requests/:id/reject", rejectStudentRequest);
router.get("/trial-bookings", listAdminTrialBookings);
router.patch("/trial-bookings/:id/status", patchAdminTrialBookingStatus);
router.get("/contact-messages", listAdminContactMessages);
router.patch("/contact-messages/:id/status", patchAdminContactMessageStatus);

router.get("/curriculum", getAdminCurriculumTree);
router.put("/curriculum", updateAdminCurriculumTree);
router.post("/curriculum/reset", resetAdminCurriculumTree);

router.get("/schedule/routine", getAdminWeeklyRoutine);
router.post("/schedule/resync", resyncAdminSchedule);

/** Blog CMS — admin role only (router-level guard above). */
router.get("/blog/posts", adminGetBlogPosts);
router.get("/blog/posts/:id", adminGetBlogPostById);
router.post("/blog/posts", adminCreateBlogPost);
router.put("/blog/posts/:id", adminUpdateBlogPost);
router.delete("/blog/posts/:id", adminDeleteBlogPost);

export default router;

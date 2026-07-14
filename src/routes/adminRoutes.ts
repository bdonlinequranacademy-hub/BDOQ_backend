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
import { getUserProfileDetail } from "../controllers/adminUserProfileController";
import {
  adminCreateBlogPost,
  adminDeleteBlogPost,
  adminGetBlogPostById,
  adminGetBlogPosts,
  adminUpdateBlogPost,
} from "../controllers/adminBlogController";
import {
  adminCreateResource,
  adminDeleteResource,
  adminGetResourceById,
  adminGetResources,
  adminUpdateResource,
  adminUploadResourceFile,
} from "../controllers/adminResourceController";
import { uploadResourceFile } from "../middleware/uploadResourceFile";
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
  listAdminNewsletterSubscribers,
  patchAdminNewsletterSubscriberStatus,
} from "../controllers/newsletterSubscriberController";
import {
  listAdminStudentAdmissions,
  patchAdminStudentAdmissionStatus,
} from "../controllers/studentAdmissionController";
import {
  listAdminTeacherApplications,
  patchAdminTeacherApplicationStatus,
} from "../controllers/teacherApplicationController";
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
  getAdminPaymentInvoice,
  getStudentBilling,
  listAdminPayments,
  listOverdueBillings,
  rejectPayment,
  upsertStudentBilling,
} from "../controllers/paymentController";
import {
  adminCreateGalleryItem,
  adminDeleteGalleryItem,
  adminGetGalleryItemById,
  adminGetGalleryItems,
  adminUpdateGalleryItem,
} from "../controllers/adminGalleryController";
import {
  adminCreatePricingPackage,
  adminDeletePricingPackage,
  adminGetPricingPackageById,
  adminGetPricingPackages,
  adminUpdatePricingPackage,
} from "../controllers/adminPricingController";
import {
  adminCreateTestimonial,
  adminDeleteTestimonial,
  adminGetTestimonialById,
  adminGetTestimonials,
  adminUpdateTestimonial,
} from "../controllers/adminTestimonialController";
import { getWhatsAppQueue } from "../controllers/whatsappQueueController";
import { getAdminLiveMonitor } from "../controllers/liveMonitorController";
import {
  createAdminCertificate,
  getAdminCertificate,
  listAdminCertificates,
  previewAdminCertificate,
} from "../controllers/certificateController";
import {
  changeAdminPassword,
  getAdminProfile,
  updateAdminProfile,
} from "../controllers/adminProfileController";
import { uploadProfileAvatar } from "../controllers/avatarController";
import { avatarUpload } from "../middleware/uploadAvatar";

const router = Router();

router.use(auth, checkRole("admin", "super_admin"));

router.get("/users", getAllUsers);
router.get("/users/:id/profile", getUserProfileDetail);
router.get("/users/:id", getUserById);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

router.get("/payments", listAdminPayments);
router.get("/payments/overdue", listOverdueBillings);
router.get("/payments/:id/invoice", getAdminPaymentInvoice);
router.patch("/payments/:id/approve", approvePayment);
router.patch("/payments/:id/reject", rejectPayment);
router.get("/students/:studentId/billing", getStudentBilling);
router.put("/students/:studentId/billing", upsertStudentBilling);

router.get("/stats", getDashboardStats);
router.get("/live-monitor", getAdminLiveMonitor);
router.get("/whatsapp-queue", getWhatsAppQueue);
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
router.get("/newsletter-subscribers", listAdminNewsletterSubscribers);
router.patch(
  "/newsletter-subscribers/:id/status",
  patchAdminNewsletterSubscriberStatus
);
router.get("/student-admissions", listAdminStudentAdmissions);
router.patch("/student-admissions/:id/status", patchAdminStudentAdmissionStatus);
router.get("/teacher-applications", listAdminTeacherApplications);
router.patch("/teacher-applications/:id/status", patchAdminTeacherApplicationStatus);

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

/** Resources CMS — ebooks, audio, videos for public site */
router.post("/resources/upload", uploadResourceFile, adminUploadResourceFile);
router.get("/resources", adminGetResources);
router.get("/resources/:id", adminGetResourceById);
router.post("/resources", adminCreateResource);
router.put("/resources/:id", adminUpdateResource);
router.delete("/resources/:id", adminDeleteResource);

/** Student reviews / testimonials for public website */
router.get("/testimonials", adminGetTestimonials);
router.get("/testimonials/:id", adminGetTestimonialById);
router.post("/testimonials", adminCreateTestimonial);
router.put("/testimonials/:id", adminUpdateTestimonial);
router.delete("/testimonials/:id", adminDeleteTestimonial);

/** Photo / video / audio gallery for public website */
router.get("/gallery", adminGetGalleryItems);
router.get("/gallery/:id", adminGetGalleryItemById);
router.post("/gallery", adminCreateGalleryItem);
router.put("/gallery/:id", adminUpdateGalleryItem);
router.delete("/gallery/:id", adminDeleteGalleryItem);

/** Pricing packages for public website */
router.get("/pricing", adminGetPricingPackages);
router.get("/pricing/:id", adminGetPricingPackageById);
router.post("/pricing", adminCreatePricingPackage);
router.put("/pricing/:id", adminUpdatePricingPackage);
router.delete("/pricing/:id", adminDeletePricingPackage);

router.get("/certificates", listAdminCertificates);
router.post("/certificates/preview", previewAdminCertificate);
router.post("/certificates", createAdminCertificate);
router.get("/certificates/:id", getAdminCertificate);

router.get("/profile", getAdminProfile);
router.patch("/profile", updateAdminProfile);
router.patch("/profile/password", changeAdminPassword);
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

export default router;

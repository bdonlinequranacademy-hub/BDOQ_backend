import { Router } from "express";
import { submitContactMessage } from "../controllers/contactMessageController";
import { submitNewsletterSubscriber } from "../controllers/newsletterSubscriberController";
import { submitStudentAdmission } from "../controllers/studentAdmissionController";
import { submitTeacherApplication } from "../controllers/teacherApplicationController";
import { submitTrialBooking } from "../controllers/trialBookingController";
import { verifyPublicCertificate } from "../controllers/certificateController";
import { getPublicLiveDashboardHandler } from "../controllers/liveMonitorController";
import {
  getPublicCourseBySlugHandler,
  getPublicCoursesHandler,
  getPublicFaqHandler,
  getPublicGalleryHandler,
  getPublicPricingHandler,
  getPublicProgressHighlightsHandler,
  getPublicSchedulePreviewHandler,
  getPublicStatsHandler,
  getPublicTeacherBySlugHandler,
  getPublicTeachersHandler,
  getPublicTestimonialsHandler,
} from "../controllers/publicContentController";
import { teacherApplicationUpload } from "../middleware/uploadTeacherApplication";

const router = Router();

/** Public marketing endpoints (no auth). */
router.get("/teachers", getPublicTeachersHandler);
router.get("/teachers/:slug", getPublicTeacherBySlugHandler);
router.get("/courses", getPublicCoursesHandler);
router.get("/courses/:slug", getPublicCourseBySlugHandler);
router.get("/pricing", getPublicPricingHandler);
router.get("/testimonials", getPublicTestimonialsHandler);
router.get("/faq", getPublicFaqHandler);
router.get("/gallery", getPublicGalleryHandler);
router.get("/schedule-preview", getPublicSchedulePreviewHandler);
router.get("/stats", getPublicStatsHandler);
router.get("/progress-highlights", getPublicProgressHighlightsHandler);
router.get("/live-dashboard", getPublicLiveDashboardHandler);
router.post("/trial-bookings", submitTrialBooking);
router.post("/contact-messages", submitContactMessage);
router.post("/newsletter-subscribers", submitNewsletterSubscriber);
router.post("/student-admissions", submitStudentAdmission);
router.post(
  "/teacher-applications",
  teacherApplicationUpload,
  submitTeacherApplication
);

router.get("/certificates/verify/:certificateId", verifyPublicCertificate);

export default router;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contactMessageController_1 = require("../controllers/contactMessageController");
const newsletterSubscriberController_1 = require("../controllers/newsletterSubscriberController");
const studentAdmissionController_1 = require("../controllers/studentAdmissionController");
const teacherApplicationController_1 = require("../controllers/teacherApplicationController");
const trialBookingController_1 = require("../controllers/trialBookingController");
const certificateController_1 = require("../controllers/certificateController");
const liveMonitorController_1 = require("../controllers/liveMonitorController");
const publicContentController_1 = require("../controllers/publicContentController");
const uploadStudentAdmission_1 = require("../middleware/uploadStudentAdmission");
const uploadTeacherApplication_1 = require("../middleware/uploadTeacherApplication");
const router = (0, express_1.Router)();
/** Public marketing endpoints (no auth). */
router.get("/teachers", publicContentController_1.getPublicTeachersHandler);
router.get("/teachers/:slug", publicContentController_1.getPublicTeacherBySlugHandler);
router.get("/courses", publicContentController_1.getPublicCoursesHandler);
router.get("/courses/:slug", publicContentController_1.getPublicCourseBySlugHandler);
router.get("/pricing", publicContentController_1.getPublicPricingHandler);
router.get("/testimonials", publicContentController_1.getPublicTestimonialsHandler);
router.get("/faq", publicContentController_1.getPublicFaqHandler);
router.get("/gallery", publicContentController_1.getPublicGalleryHandler);
router.get("/home-hero", publicContentController_1.getPublicHomeHeroHandler);
router.get("/section-headers", publicContentController_1.getPublicSectionHeadersHandler);
router.get("/schedule-preview", publicContentController_1.getPublicSchedulePreviewHandler);
router.get("/stats", publicContentController_1.getPublicStatsHandler);
router.get("/progress-highlights", publicContentController_1.getPublicProgressHighlightsHandler);
router.get("/live-dashboard", liveMonitorController_1.getPublicLiveDashboardHandler);
router.post("/trial-bookings", trialBookingController_1.submitTrialBooking);
router.post("/contact-messages", contactMessageController_1.submitContactMessage);
router.post("/newsletter-subscribers", newsletterSubscriberController_1.submitNewsletterSubscriber);
router.post("/student-admissions", (req, res, next) => {
    (0, uploadStudentAdmission_1.studentAdmissionUpload)(req, res, (err) => {
        if (err) {
            const message = err instanceof Error ? err.message : "Upload failed";
            res.status(400).json({ success: false, message, data: null });
            return;
        }
        next();
    });
}, studentAdmissionController_1.submitStudentAdmission);
router.post("/teacher-applications", uploadTeacherApplication_1.teacherApplicationUpload, teacherApplicationController_1.submitTeacherApplication);
router.get("/certificates/verify/:certificateId", certificateController_1.verifyPublicCertificate);
exports.default = router;

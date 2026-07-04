"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contactMessageController_1 = require("../controllers/contactMessageController");
const studentAdmissionController_1 = require("../controllers/studentAdmissionController");
const teacherApplicationController_1 = require("../controllers/teacherApplicationController");
const trialBookingController_1 = require("../controllers/trialBookingController");
const certificateController_1 = require("../controllers/certificateController");
const uploadTeacherApplication_1 = require("../middleware/uploadTeacherApplication");
const router = (0, express_1.Router)();
/** Public marketing endpoints (no auth). */
router.post("/trial-bookings", trialBookingController_1.submitTrialBooking);
router.post("/contact-messages", contactMessageController_1.submitContactMessage);
router.post("/student-admissions", studentAdmissionController_1.submitStudentAdmission);
router.post("/teacher-applications", uploadTeacherApplication_1.teacherApplicationUpload, teacherApplicationController_1.submitTeacherApplication);
router.get("/certificates/verify/:certificateId", certificateController_1.verifyPublicCertificate);
exports.default = router;

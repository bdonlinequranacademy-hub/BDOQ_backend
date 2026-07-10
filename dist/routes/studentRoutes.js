"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const studentController_1 = require("../controllers/studentController");
const sessionJoinController_1 = require("../controllers/sessionJoinController");
const weeklyReportController_1 = require("../controllers/weeklyReportController");
const studentProfileController_1 = require("../controllers/studentProfileController");
const avatarController_1 = require("../controllers/avatarController");
const uploadAvatar_1 = require("../middleware/uploadAvatar");
const uploadPaymentProof_1 = require("../middleware/uploadPaymentProof");
const paymentController_1 = require("../controllers/paymentController");
const router = (0, express_1.Router)();
router.use(auth_1.auth, (0, auth_1.checkRole)("student"));
router.get("/classes", studentController_1.getMyClasses);
router.get("/schedule/today", studentController_1.getTodaySchedule);
router.post("/session/join/:slotId", sessionJoinController_1.recordStudentSessionJoin);
router.get("/classes/:id", studentController_1.getClassById);
router.get("/homework", studentController_1.getMyHomework);
router.post("/homework/:id/submit", studentController_1.submitHomework);
router.get("/attendance", studentController_1.getMyAttendance);
router.get("/progress", studentController_1.getMyProgress);
router.get("/curriculum-plan", studentController_1.getMyCurriculumPlan);
router.get("/weekly-report", weeklyReportController_1.getStudentWeeklyReport);
router.get("/notifications", studentController_1.getMyNotifications);
router.patch("/notifications/:id/read", studentController_1.markAsRead);
router.get("/profile", studentProfileController_1.getStudentProfile);
router.patch("/profile", studentProfileController_1.updateStudentProfile);
router.patch("/profile/password", studentProfileController_1.changeStudentPassword);
router.post("/profile/avatar", (req, res, next) => {
    (0, uploadAvatar_1.avatarUpload)(req, res, (err) => {
        if (err) {
            const message = err instanceof Error ? err.message : "Upload failed";
            res.status(400).json({ success: false, message, data: null });
            return;
        }
        next();
    });
}, avatarController_1.uploadProfileAvatar);
router.get("/payments/status", paymentController_1.getStudentPaymentStatus);
router.get("/payments", paymentController_1.listStudentPayments);
router.get("/payments/:id/invoice", paymentController_1.getStudentPaymentInvoice);
router.post("/payments", (req, res, next) => {
    (0, uploadPaymentProof_1.paymentProofUpload)(req, res, (err) => {
        if (err) {
            const message = err instanceof Error ? err.message : "Upload failed";
            res.status(400).json({ success: false, message, data: null });
            return;
        }
        next();
    });
}, paymentController_1.submitStudentPayment);
exports.default = router;

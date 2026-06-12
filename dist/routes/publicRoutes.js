"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contactMessageController_1 = require("../controllers/contactMessageController");
const trialBookingController_1 = require("../controllers/trialBookingController");
const router = (0, express_1.Router)();
/** Public marketing endpoints (no auth). */
router.post("/trial-bookings", trialBookingController_1.submitTrialBooking);
router.post("/contact-messages", contactMessageController_1.submitContactMessage);
exports.default = router;

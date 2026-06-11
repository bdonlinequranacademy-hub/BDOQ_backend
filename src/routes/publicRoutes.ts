import { Router } from "express";
import { submitContactMessage } from "../controllers/contactMessageController";
import { submitTrialBooking } from "../controllers/trialBookingController";

const router = Router();

/** Public marketing endpoints (no auth). */
router.post("/trial-bookings", submitTrialBooking);
router.post("/contact-messages", submitContactMessage);

export default router;

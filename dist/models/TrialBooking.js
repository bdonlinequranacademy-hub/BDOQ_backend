"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrialBooking = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const trialBookingSchema = new mongoose_1.Schema({
    parentName: { type: String, required: true, trim: true },
    studentName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    whatsapp: { type: String, required: true, trim: true },
    country: { type: String, trim: true },
    age: { type: String, trim: true },
    learnerGender: {
        type: String,
        enum: ["male", "female"],
    },
    learnerType: {
        type: String,
        enum: ["child", "teen", "adult"],
        required: true,
    },
    preferredTrialDate: { type: String, trim: true },
    preferredTrialTime: { type: String, trim: true },
    additionalNote: { type: String, trim: true },
    timeSlot: {
        type: String,
        enum: ["anytime", "early_morning", "morning", "afternoon", "evening", "late_evening"],
    },
    teacherPreference: {
        type: String,
        enum: ["any", "female", "male"],
        default: "any",
    },
    preferredDays: [{ type: String, trim: true }],
    timezone: { type: String, trim: true },
    source: { type: String, trim: true },
    courseSlug: { type: String, trim: true },
    teacherSlug: { type: String, trim: true },
    meetingPlatform: {
        type: String,
        enum: ["google_meet", "zoom", "teams", "whatsapp", "custom"],
    },
    meetingLink: { type: String, trim: true },
    invitationSentAt: { type: Date },
    convertedAdmissionId: { type: mongoose_1.Schema.Types.ObjectId, ref: "StudentAdmissionApplication" },
    convertedUserId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    convertedAt: { type: Date },
    admissionPrefillToken: { type: String, trim: true },
    utmSource: { type: String, trim: true },
    utmMedium: { type: String, trim: true },
    utmCampaign: { type: String, trim: true },
    utmContent: { type: String, trim: true },
    status: {
        type: String,
        enum: ["new", "contacted", "scheduled", "closed"],
        default: "new",
    },
}, { timestamps: true });
trialBookingSchema.index({ status: 1, createdAt: -1 });
trialBookingSchema.index({ email: 1, createdAt: -1 });
exports.TrialBooking = mongoose_1.default.model("TrialBooking", trialBookingSchema);

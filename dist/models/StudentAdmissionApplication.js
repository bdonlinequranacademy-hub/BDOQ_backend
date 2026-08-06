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
exports.StudentAdmissionApplication = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const studentAdmissionApplicationSchema = new mongoose_1.Schema({
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true },
    whatsapp: { type: String, required: true, trim: true },
    formData: { type: mongoose_1.Schema.Types.Mixed, required: true },
    locale: { type: String, enum: ["en", "bn"] },
    status: {
        type: String,
        enum: ["new", "reviewing", "approved", "closed"],
        default: "new",
    },
    adminNote: { type: String, trim: true, maxlength: 2000 },
    sourceTrialBookingId: { type: mongoose_1.Schema.Types.ObjectId, ref: "TrialBooking" },
    prefillToken: { type: String, trim: true, unique: true, sparse: true },
    convertedFromTrial: { type: Boolean, default: false },
    paymentStatus: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending",
    },
    paymentVerifiedAt: { type: Date },
    paymentRejectedAt: { type: Date },
    paymentRejectReason: { type: String, trim: true, maxlength: 500 },
    classStartDate: { type: String, trim: true },
    classDays: [
        {
            type: String,
            enum: [
                "Saturday",
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
            ],
        },
    ],
    classesPerWeek: { type: Number, min: 1, max: 7 },
    classDurationMinutes: { type: Number, min: 15, max: 180 },
    classTime: { type: String, trim: true },
    assignedTeacherSlug: { type: String, trim: true },
    assignedTeacherName: { type: String, trim: true },
    meetingPlatform: {
        type: String,
        enum: ["google_meet", "zoom", "teams", "whatsapp", "custom"],
    },
    meetingLink: { type: String, trim: true },
    monthlyFeeAmount: { type: Number, min: 0 },
    monthlyFeeCurrency: { type: String, enum: ["bdt", "usd"] },
    enrollmentSetupAt: { type: Date },
}, { timestamps: true });
studentAdmissionApplicationSchema.index({ status: 1, createdAt: -1 });
studentAdmissionApplicationSchema.index({ email: 1, createdAt: -1 });
exports.StudentAdmissionApplication = mongoose_1.default.model("StudentAdmissionApplication", studentAdmissionApplicationSchema);

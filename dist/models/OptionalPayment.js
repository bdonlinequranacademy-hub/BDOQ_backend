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
exports.OptionalPayment = exports.OPTIONAL_PAYMENT_CURRENCIES = exports.OPTIONAL_PAYMENT_STATUSES = exports.OPTIONAL_PAYMENT_METHODS = exports.OPTIONAL_PAYMENT_CATEGORIES = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.OPTIONAL_PAYMENT_CATEGORIES = [
    "teacher_bakhshish",
    "eid_gift",
    "sponsor_student",
    "sadaqah",
    "custom",
];
exports.OPTIONAL_PAYMENT_METHODS = [
    "bkash",
    "nagad",
    "rocket",
    "bank",
];
exports.OPTIONAL_PAYMENT_STATUSES = [
    "pending",
    "approved",
    "rejected",
];
exports.OPTIONAL_PAYMENT_CURRENCIES = ["BDT", "USD"];
const optionalPaymentSchema = new mongoose_1.Schema({
    category: {
        type: String,
        enum: exports.OPTIONAL_PAYMENT_CATEGORIES,
        required: true,
        index: true,
    },
    customLabel: { type: String, trim: true, maxlength: 120 },
    amount: { type: Number, required: true, min: 1 },
    currency: {
        type: String,
        enum: exports.OPTIONAL_PAYMENT_CURRENCIES,
        default: "BDT",
    },
    method: {
        type: String,
        enum: exports.OPTIONAL_PAYMENT_METHODS,
        required: true,
    },
    payerName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    whatsapp: { type: String, trim: true, maxlength: 40 },
    note: { type: String, trim: true, maxlength: 2000 },
    reference: { type: String, required: true, trim: true, maxlength: 120 },
    paymentDate: { type: Date, required: true },
    screenshotUrl: { type: String, required: true, trim: true },
    screenshotPublicId: { type: String, required: true, trim: true },
    status: {
        type: String,
        enum: exports.OPTIONAL_PAYMENT_STATUSES,
        default: "pending",
        index: true,
    },
    rejectionReason: { type: String, trim: true, maxlength: 500 },
    linkedUserId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", index: true },
    source: {
        type: String,
        enum: ["public", "portal"],
        default: "public",
    },
    locale: { type: String, enum: ["en", "bn"] },
    reviewedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
}, { timestamps: true });
optionalPaymentSchema.index({ status: 1, createdAt: -1 });
optionalPaymentSchema.index({ category: 1, createdAt: -1 });
optionalPaymentSchema.index({ email: 1, createdAt: -1 });
exports.OptionalPayment = mongoose_1.default.model("OptionalPayment", optionalPaymentSchema);

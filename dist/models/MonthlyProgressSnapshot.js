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
exports.DEFAULT_MONTHLY_QUESTIONS = exports.MonthlyProgressSnapshot = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const qaItemSchema = new mongoose_1.Schema({
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
}, { _id: false });
const monthlyProgressSchema = new mongoose_1.Schema({
    student: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    class: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Class",
        required: true,
    },
    teacher: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    month: {
        type: String,
        required: true,
        trim: true,
        match: /^\d{4}-\d{2}$/,
    },
    surahsCompleted: {
        type: [String],
        default: [],
    },
    tajweedScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
    memorizedAyahs: {
        type: Number,
        default: 0,
        min: 0,
    },
    teacherSummary: {
        type: String,
        trim: true,
    },
    qaResponses: {
        type: [qaItemSchema],
        default: [],
    },
    activityDates: {
        type: [String],
        default: [],
    },
    sessionsHeld: {
        type: Number,
        default: 0,
        min: 0,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, { timestamps: true });
monthlyProgressSchema.index({ student: 1, class: 1, month: 1 }, { unique: true });
monthlyProgressSchema.index({ teacher: 1, month: 1 });
exports.MonthlyProgressSnapshot = mongoose_1.default.model("MonthlyProgressSnapshot", monthlyProgressSchema);
exports.DEFAULT_MONTHLY_QUESTIONS = [
    "What progress did the student make this month?",
    "Which areas need more focus next month?",
    "Message for parents/guardians?",
];

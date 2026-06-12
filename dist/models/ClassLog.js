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
exports.ClassLog = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const timeSnapshotSchema = new mongoose_1.Schema({
    time: { type: String, required: true },
    timezone: { type: String, required: true },
}, { _id: false });
const classLogSchema = new mongoose_1.Schema({
    sessionSlot: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "SessionSlot",
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
    student: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    sessionDate: {
        type: String,
        required: true,
        trim: true,
    },
    durationMinutes: {
        type: Number,
        required: true,
        min: 15,
    },
    courseType: {
        type: String,
        trim: true,
        default: "Quran",
    },
    lessonReport: {
        type: String,
        required: true,
        trim: true,
    },
    topicsCovered: {
        type: [String],
        default: [],
    },
    curriculumProgram: {
        type: String,
        trim: true,
    },
    curriculumUnit: {
        type: String,
        trim: true,
    },
    curriculumTopic: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    adminNote: {
        type: String,
        trim: true,
    },
    approvedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
    },
    approvedAt: {
        type: Date,
    },
    earningsBdt: {
        type: Number,
        min: 0,
    },
    times: {
        academy: { type: timeSnapshotSchema, required: true },
        teacher: { type: timeSnapshotSchema, required: true },
        student: { type: timeSnapshotSchema, required: true },
    },
}, { timestamps: true });
classLogSchema.index({ teacher: 1, sessionDate: -1 });
classLogSchema.index({ status: 1, createdAt: -1 });
classLogSchema.index({ sessionSlot: 1, sessionDate: 1 }, { unique: true });
exports.ClassLog = mongoose_1.default.model("ClassLog", classLogSchema);

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
exports.SessionSlot = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const sessionSlotSchema = new mongoose_1.Schema({
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
    day: {
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
        required: true,
    },
    startTime: {
        type: String,
        required: true,
        trim: true,
    },
    durationMinutes: {
        type: Number,
        default: 60,
        min: 15,
    },
    courseType: {
        type: String,
        trim: true,
        default: "Quran",
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    sessionPhase: {
        type: String,
        enum: ["upcoming", "live", "completed"],
        default: "upcoming",
    },
}, { timestamps: true });
sessionSlotSchema.index({ teacher: 1, day: 1, isActive: 1 });
sessionSlotSchema.index({ student: 1, day: 1, isActive: 1 });
sessionSlotSchema.index({ student: 1, isActive: 1 });
sessionSlotSchema.index({ day: 1, isActive: 1 });
sessionSlotSchema.index({ class: 1, day: 1, isActive: 1 });
sessionSlotSchema.index({ class: 1, student: 1, day: 1 }, { unique: true });
exports.SessionSlot = mongoose_1.default.model("SessionSlot", sessionSlotSchema);

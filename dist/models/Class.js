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
exports.Class = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const scheduleSchema = new mongoose_1.Schema({
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
    time: {
        type: String,
        required: true,
    },
    duration: {
        type: Number,
        default: 60,
    },
    repeatWeekly: {
        type: Boolean,
        default: true,
    },
}, { _id: false });
const classSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    teacher: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    students: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "User",
        },
    ],
    schedule: scheduleSchema,
    meetingLink: {
        type: String,
        trim: true,
    },
    meetingPlatform: {
        type: String,
        enum: ["google_meet", "zoom", "teams", "whatsapp", "custom"],
    },
    sessionRateBdt: {
        type: Number,
        min: 0,
        default: 500,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });
classSchema.index({ teacher: 1, isActive: 1 });
classSchema.index({ students: 1 });
classSchema.index({ "schedule.day": 1, isActive: 1 });
exports.Class = mongoose_1.default.model("Class", classSchema);

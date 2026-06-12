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
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const userSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    role: {
        type: String,
        enum: ["student", "teacher", "admin", "parent"],
        default: "student",
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    authProvider: {
        type: String,
        enum: ["local", "google", "facebook"],
        default: "local",
    },
    providerId: {
        type: String,
        default: null,
    },
    children: {
        type: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
        default: [],
    },
    studentId: {
        type: String,
        trim: true,
        unique: true,
        sparse: true,
    },
    gender: {
        type: String,
        enum: ["male", "female"],
    },
    timezone: {
        type: String,
        trim: true,
        default: "Asia/Dhaka",
    },
    country: {
        type: String,
        trim: true,
        default: "",
    },
    curriculumAssignments: {
        type: [
            {
                programId: { type: String, required: true, trim: true },
                unitId: { type: String, trim: true },
                topicId: { type: String, trim: true },
                completed: { type: Boolean, default: false },
                completedAt: { type: Date },
            },
        ],
        default: [],
    },
    meetingLink: {
        type: String,
        trim: true,
        default: "",
    },
    bankName: {
        type: String,
        trim: true,
        default: "",
    },
    bankAccount: {
        type: String,
        trim: true,
        default: "",
    },
    bKashNumber: {
        type: String,
        trim: true,
        default: "",
    },
    emailVerified: {
        type: Boolean,
        default: false,
    },
    emailVerificationToken: {
        type: String,
        default: null,
    },
    emailVerificationExpiry: {
        type: Date,
        default: null,
    },
    passwordResetToken: {
        type: String,
        default: null,
    },
    passwordResetExpiry: {
        type: Date,
        default: null,
    },
}, {
    timestamps: { createdAt: true, updatedAt: false },
});
exports.User = mongoose_1.default.model("User", userSchema);

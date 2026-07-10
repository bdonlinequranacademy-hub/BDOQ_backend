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
exports.TeacherProfile = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const teacherProfileSchema = new mongoose_1.Schema({
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    bio: { type: String, required: true, trim: true },
    about: { type: String, trim: true },
    gender: {
        type: String,
        enum: ["male", "female"],
        required: true,
    },
    country: { type: String, trim: true },
    location: { type: String, trim: true },
    address: { type: String, trim: true },
    dateOfBirth: { type: String, trim: true },
    age: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    featured: { type: Boolean, default: false },
    showOnWebsite: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    qualifications: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    experience: { type: String, trim: true },
    languages: { type: [String], default: [] },
    courseSlugs: { type: [String], default: [] },
    linkedUserId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
    },
}, { timestamps: true });
teacherProfileSchema.index({ showOnWebsite: 1, gender: 1, sortOrder: 1 });
teacherProfileSchema.index({ featured: 1, sortOrder: 1 });
exports.TeacherProfile = mongoose_1.default.model("TeacherProfile", teacherProfileSchema);

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
exports.ConcernReport = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const concernReportSchema = new mongoose_1.Schema({
    reporter: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    reporterRole: {
        type: String,
        enum: ["student", "teacher"],
        required: true,
    },
    reporterName: { type: String, required: true, trim: true },
    category: {
        type: String,
        enum: ["poaching", "safety", "conduct", "other"],
        default: "other",
    },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    relatedTeacher: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    relatedStudent: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    status: {
        type: String,
        enum: ["new", "reviewed", "closed"],
        default: "new",
    },
    adminNote: { type: String, trim: true, maxlength: 2000 },
}, { timestamps: true });
concernReportSchema.index({ status: 1, createdAt: -1 });
exports.ConcernReport = mongoose_1.default.model("ConcernReport", concernReportSchema);

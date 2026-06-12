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
exports.Homework = void 0;
exports.resolveSubmissionStatus = resolveSubmissionStatus;
exports.isSubmissionAccepted = isSubmissionAccepted;
const mongoose_1 = __importStar(require("mongoose"));
const submissionSchema = new mongoose_1.Schema({
    student: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    submittedAt: {
        type: Date,
    },
    content: {
        type: String,
    },
    status: {
        type: String,
        enum: ["pending_review", "approved", "returned", "graded"],
    },
    reviewFeedback: {
        type: String,
    },
    reviewedAt: {
        type: Date,
    },
    grade: {
        type: String,
    },
    feedback: {
        type: String,
    },
}, { _id: true });
const homeworkSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
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
    dueDate: {
        type: Date,
        required: true,
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
    submissions: [submissionSchema],
}, { timestamps: true });
exports.Homework = mongoose_1.default.model("Homework", homeworkSchema);
function resolveSubmissionStatus(submission) {
    if (!submission?.submittedAt)
        return null;
    if (submission.status)
        return submission.status;
    if (submission.grade)
        return "graded";
    return "approved";
}
function isSubmissionAccepted(status) {
    return status === "approved" || status === "graded";
}

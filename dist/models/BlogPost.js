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
exports.BlogPost = exports.BLOG_CATEGORIES = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.BLOG_CATEGORIES = [
    "Quran & Tajweed",
    "Parent Guides",
    "Learning Tips",
    "Platform & AI",
];
const blogAuthorSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    role: { type: String, trim: true },
}, { _id: false });
const blogFaqSchema = new mongoose_1.Schema({
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
}, { _id: false });
const blogTranslationSchema = new mongoose_1.Schema({
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    body: { type: String },
    tags: [{ type: String, trim: true }],
}, { _id: false });
const blogPostSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    pubDate: { type: Date, required: true, default: () => new Date() },
    category: {
        type: String,
        required: true,
        enum: exports.BLOG_CATEGORIES,
    },
    tags: [{ type: String, trim: true }],
    author: { type: blogAuthorSchema, required: true },
    readMinutes: { type: Number, min: 1 },
    featured: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ["draft", "published"],
        default: "draft",
    },
    faqs: [blogFaqSchema],
    translations: {
        bn: { type: blogTranslationSchema, default: undefined },
    },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
blogPostSchema.index({ status: 1, pubDate: -1 });
blogPostSchema.index({ category: 1, status: 1 });
exports.BlogPost = mongoose_1.default.model("BlogPost", blogPostSchema);

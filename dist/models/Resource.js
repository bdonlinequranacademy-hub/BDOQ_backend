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
exports.Resource = exports.RESOURCE_SECTIONS = exports.EBOOK_LANGUAGES = exports.EBOOK_CATEGORIES = exports.RESOURCE_STATUS = exports.RESOURCE_TYPES = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.RESOURCE_TYPES = ["ebook", "audio", "video"];
exports.RESOURCE_STATUS = ["draft", "published"];
exports.EBOOK_CATEGORIES = [
    "tajweed",
    "islamic-history",
    "religious",
];
exports.EBOOK_LANGUAGES = ["en", "bn", "both"];
/** Sub-section within a resource type (audio/video pages). */
exports.RESOURCE_SECTIONS = [
    "default",
    "featured",
    "verses",
    "recitation",
    "gallery",
    "playlist",
];
const audioVerseSchema = new mongoose_1.Schema({
    arabic: { type: String, required: true, trim: true },
    translation: { type: String, required: true, trim: true },
}, { _id: false });
const resourceTranslationSchema = new mongoose_1.Schema({
    title: { type: String, trim: true },
    description: { type: String, trim: true },
}, { _id: false });
const resourceSchema = new mongoose_1.Schema({
    type: { type: String, required: true, enum: exports.RESOURCE_TYPES },
    section: {
        type: String,
        enum: exports.RESOURCE_SECTIONS,
        default: "default",
    },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    status: {
        type: String,
        enum: exports.RESOURCE_STATUS,
        default: "draft",
    },
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    category: { type: String, enum: exports.EBOOK_CATEGORIES },
    coverGradient: { type: String, trim: true },
    coverUrl: { type: String, trim: true },
    coverPublicId: { type: String, trim: true },
    pdfUrl: { type: String, trim: true },
    pdfPublicId: { type: String, trim: true },
    fileSize: { type: String, trim: true },
    pageCount: { type: Number, min: 0 },
    language: { type: String, enum: exports.EBOOK_LANGUAGES },
    author: { type: String, trim: true },
    audioUrl: { type: String, trim: true },
    audioPublicId: { type: String, trim: true },
    duration: { type: String, trim: true },
    paraInfo: { type: String, trim: true },
    surahName: { type: String, trim: true },
    progress: { type: Number, min: 0, max: 100 },
    verses: [audioVerseSchema],
    youtubeId: { type: String, trim: true },
    startSeconds: { type: Number, min: 0 },
    translations: {
        bn: { type: resourceTranslationSchema, default: undefined },
    },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    publishedAt: { type: Date },
}, { timestamps: true });
resourceSchema.index({ type: 1, status: 1, sortOrder: 1 });
resourceSchema.index({ type: 1, slug: 1 }, { unique: true });
resourceSchema.index({ type: 1, section: 1, status: 1 });
exports.Resource = mongoose_1.default.model("Resource", resourceSchema);

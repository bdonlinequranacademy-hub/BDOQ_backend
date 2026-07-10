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
exports.CourseCatalog = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const courseDetailSchema = new mongoose_1.Schema({
    benefits: [
        {
            id: { type: String, required: true },
            title: { type: String, required: true },
            description: { type: String, required: true },
            icon: { type: String, required: true },
        },
    ],
    modules: [
        {
            id: { type: String, required: true },
            title: { type: String, required: true },
            topics: [{ type: String }],
        },
    ],
    audience: [{ type: String }],
    faqs: [
        {
            id: { type: String, required: true },
            question: { type: String, required: true },
            answer: { type: String, required: true },
        },
    ],
    startingPriceBdt: { type: Number, required: true },
    recommendedPackage: { type: String, required: true },
}, { _id: false });
const courseCatalogSchema = new mongoose_1.Schema({
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    icon: { type: String, default: "📖" },
    target: { type: String, trim: true },
    category: {
        type: String,
        enum: ["private", "record", "live", "free"],
        required: true,
    },
    gender: {
        type: String,
        enum: ["male", "female", "children"],
    },
    sortOrder: { type: Number, default: 0 },
    showOnWebsite: { type: Boolean, default: true },
    detail: { type: courseDetailSchema, required: true },
}, { timestamps: true });
courseCatalogSchema.index({ showOnWebsite: 1, category: 1, sortOrder: 1 });
exports.CourseCatalog = mongoose_1.default.model("CourseCatalog", courseCatalogSchema);

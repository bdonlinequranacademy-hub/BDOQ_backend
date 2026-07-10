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
exports.GalleryItem = exports.GALLERY_MEDIA_TYPES = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.GALLERY_MEDIA_TYPES = ["photo", "video", "audio"];
const galleryItemSchema = new mongoose_1.Schema({
    externalId: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    album: {
        type: String,
        enum: ["gallery-01", "gallery-02", "gallery-03"],
        required: true,
    },
    mediaType: {
        type: String,
        enum: exports.GALLERY_MEDIA_TYPES,
        default: "photo",
    },
    mediaUrl: { type: String, trim: true },
    mediaPublicId: { type: String, trim: true },
    youtubeId: { type: String, trim: true },
    coverGradient: { type: String, required: true, trim: true },
    heightClass: { type: String, default: "h-56", trim: true },
    imageUrl: { type: String, trim: true },
    sortOrder: { type: Number, default: 0 },
    showOnWebsite: { type: Boolean, default: true },
}, { timestamps: true });
exports.GalleryItem = mongoose_1.default.model("GalleryItem", galleryItemSchema);

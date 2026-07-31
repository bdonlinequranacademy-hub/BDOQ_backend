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
exports.HomeHeroSlide = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const localeContentSchema = new mongoose_1.Schema({
    badge: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    titleHighlight: { type: String, trim: true },
    subtitle: { type: String, required: true, trim: true },
    imageAlt: { type: String, required: true, trim: true },
    primaryCta: { type: String, required: true, trim: true },
    secondaryCta: { type: String, required: true, trim: true },
}, { _id: false });
const homeHeroSlideSchema = new mongoose_1.Schema({
    slideId: { type: String, required: true, unique: true, trim: true },
    sortOrder: { type: Number, default: 0 },
    imageUrl: { type: String, required: true, trim: true },
    imagePublicId: { type: String, trim: true },
    imageObjectPosition: { type: String, default: "50% 25%", trim: true },
    imageScale: { type: Number, default: 100, min: 85, max: 100 },
    primaryHref: { type: String, required: true, trim: true },
    secondaryHref: { type: String, required: true, trim: true },
    theme: { type: String, enum: ["light", "dark"], default: "light" },
    showOnWebsite: { type: Boolean, default: true },
    contentEn: { type: localeContentSchema, required: true },
    contentBn: { type: localeContentSchema, required: true },
}, { timestamps: true });
exports.HomeHeroSlide = mongoose_1.default.model("HomeHeroSlide", homeHeroSlideSchema);

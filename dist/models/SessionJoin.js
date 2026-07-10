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
exports.SessionJoin = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const sessionJoinSchema = new mongoose_1.Schema({
    sessionSlot: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "SessionSlot",
        required: true,
    },
    sessionDate: {
        type: String,
        required: true,
        trim: true,
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    role: {
        type: String,
        enum: ["teacher", "student"],
        required: true,
    },
    source: {
        type: String,
        enum: ["meeting_link", "portal"],
        default: "meeting_link",
    },
    joinedAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: false });
sessionJoinSchema.index({ sessionSlot: 1, sessionDate: 1, user: 1 }, { unique: true });
sessionJoinSchema.index({ sessionDate: 1, sessionSlot: 1 });
exports.SessionJoin = mongoose_1.default.model("SessionJoin", sessionJoinSchema);

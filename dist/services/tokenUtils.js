"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRawToken = generateRawToken;
exports.hashToken = hashToken;
exports.verificationExpiry = verificationExpiry;
exports.resetExpiry = resetExpiry;
const crypto_1 = __importDefault(require("crypto"));
const TOKEN_BYTES = 32;
const VERIFICATION_HOURS = 24;
const RESET_HOURS = 1;
function generateRawToken() {
    return crypto_1.default.randomBytes(TOKEN_BYTES).toString("hex");
}
function hashToken(raw) {
    return crypto_1.default.createHash("sha256").update(raw).digest("hex");
}
function verificationExpiry() {
    return new Date(Date.now() + VERIFICATION_HOURS * 60 * 60 * 1000);
}
function resetExpiry() {
    return new Date(Date.now() + RESET_HOURS * 60 * 60 * 1000);
}

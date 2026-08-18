"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_APPLICATION_PASSWORD_LENGTH = void 0;
exports.stripPasswordFields = stripPasswordFields;
exports.readApplicationPassword = readApplicationPassword;
exports.hashApplicationPassword = hashApplicationPassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
exports.MIN_APPLICATION_PASSWORD_LENGTH = 6;
const PASSWORD_KEYS = new Set(["password", "confirmPassword", "passwordHash"]);
function stripPasswordFields(formData) {
    return Object.fromEntries(Object.entries(formData).filter(([key]) => !PASSWORD_KEYS.has(key)));
}
function readApplicationPassword(formData) {
    const password = typeof formData.password === "string" ? formData.password : "";
    const confirmPassword = typeof formData.confirmPassword === "string" ? formData.confirmPassword : "";
    if (password.length < exports.MIN_APPLICATION_PASSWORD_LENGTH) {
        return {
            error: `Password must be at least ${exports.MIN_APPLICATION_PASSWORD_LENGTH} characters.`,
        };
    }
    if (confirmPassword && password !== confirmPassword) {
        return { error: "Password and confirm password do not match." };
    }
    return { password };
}
async function hashApplicationPassword(password) {
    return bcryptjs_1.default.hash(password, 10);
}

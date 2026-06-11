"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRole = exports.auth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                message: "No token provided",
                data: null,
            });
            return;
        }
        const token = authHeader.split(" ")[1];
        if (!process.env.JWT_SECRET) {
            res.status(500).json({
                success: false,
                message: "JWT_SECRET is not configured",
                data: null,
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await User_1.User.findById(decoded.id).select("-password");
        if (!user) {
            res.status(401).json({
                success: false,
                message: "User not found",
                data: null,
            });
            return;
        }
        if (!user.isActive) {
            res.status(401).json({
                success: false,
                message: "Account is deactivated",
                data: null,
            });
            return;
        }
        req.user = user;
        next();
    }
    catch {
        res.status(401).json({
            success: false,
            message: "Invalid token",
            data: null,
        });
    }
};
exports.auth = auth;
const checkRole = (...roles) => (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: "Unauthorized",
            data: null,
        });
        return;
    }
    if (!roles.includes(req.user.role)) {
        res.status(403).json({
            success: false,
            message: "Access denied",
            data: null,
        });
        return;
    }
    next();
};
exports.checkRole = checkRole;

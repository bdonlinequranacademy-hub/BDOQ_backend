"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketServer = initSocketServer;
exports.emitToUser = emitToUser;
exports.emitAdminPending = emitAdminPending;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const cors_1 = require("../config/cors");
const User_1 = require("../models/User");
let io = null;
function initSocketServer(httpServer) {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: (0, cors_1.getAllowedOrigins)(),
            credentials: true,
        },
        path: "/socket.io",
    });
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                (typeof socket.handshake.query?.token === "string"
                    ? socket.handshake.query.token
                    : undefined);
            if (!token || !process.env.JWT_SECRET) {
                next(new Error("Unauthorized"));
                return;
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            const user = await User_1.User.findById(decoded.id).select("_id role isActive");
            if (!user?.isActive) {
                next(new Error("Unauthorized"));
                return;
            }
            socket.data.userId = user._id.toString();
            socket.data.role = user.role;
            next();
        }
        catch {
            next(new Error("Unauthorized"));
        }
    });
    io.on("connection", (socket) => {
        const userId = socket.data.userId;
        const role = socket.data.role;
        socket.join(`user:${userId}`);
        if (role === "admin") {
            socket.join("role:admin");
        }
    });
    return io;
}
function emitToUser(userId, event, payload) {
    io?.to(`user:${userId}`).emit(event, payload);
}
function emitAdminPending(reason) {
    io?.to("role:admin").emit("admin:pending", {
        reason,
        at: new Date().toISOString(),
    });
}

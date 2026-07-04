import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { isCorsDisabled, getAllowedOrigins } from "../config/cors";
import { User } from "../models/User";
import { registerClassroomHandlers, emitAdminLiveClassrooms } from "./classroomSocket";

let io: Server | null = null;

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: isCorsDisabled() ? true : getAllowedOrigins(),
      credentials: true,
    },
    path: "/socket.io",
  });

  io.use(async (socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ||
        (typeof socket.handshake.query?.token === "string"
          ? socket.handshake.query.token
          : undefined);

      if (!token || !process.env.JWT_SECRET) {
        next(new Error("Unauthorized"));
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string };
      const user = await User.findById(decoded.id).select("_id role isActive");

      if (!user?.isActive) {
        next(new Error("Unauthorized"));
        return;
      }

      socket.data.userId = user._id.toString();
      socket.data.role = user.role;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    const role = socket.data.role as string;

    socket.join(`user:${userId}`);
    if (role === "admin" || role === "super_admin") {
      socket.join("role:admin");
      if (io) emitAdminLiveClassrooms(io);
    }

    if (io) registerClassroomHandlers(io, socket);
  });

  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitAdminPending(reason?: string): void {
  io?.to("role:admin").emit("admin:pending", {
    reason,
    at: new Date().toISOString(),
  });
}

export function emitAdminLiveMonitorUpdate(): void {
  io?.to("role:admin").emit("admin:live-monitor:update", {
    at: new Date().toISOString(),
  });
}

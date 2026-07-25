import "./config/loadEnv";
import "./types/express";
import mongoose from "mongoose";
import http from "http";
import express from "express";
import cors from "cors";
import passport from "passport";
import "./config/passport";
import connectDB from "./config/db";
import { createCorsOptions } from "./config/cors";
import { validateEnv } from "./config/env";
import { verifySmtpConnection } from "./services/emailService";
import {
  migrateScheduleRepeatField,
  migrateSessionSlotIndexes,
  resyncAllClasses,
} from "./services/scheduleService";
import authRoutes from "./routes/authRoutes";
import studentRoutes from "./routes/studentRoutes";
import teacherRoutes from "./routes/teacherRoutes";
import adminRoutes from "./routes/adminRoutes";
import blogRoutes from "./routes/blogRoutes";
import resourceRoutes from "./routes/resourceRoutes";
import searchRoutes from "./routes/searchRoutes";
import publicRoutes from "./routes/publicRoutes";
import curriculumRoutes from "./routes/curriculumRoutes";
import { migrateParentAccountsToStudent, unsetStudentIdForNonStudents } from "./services/roleMigrationService";

const app = express();
const PORT = process.env.PORT || 5000;

validateEnv();

app.use(cors(createCorsOptions()));
app.use(express.json());
app.use(passport.initialize());

app.get("/api/health", (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({
    success: dbReady,
    message: dbReady ? "OK" : "Database unavailable",
    data: {
      service: "boq-academy-api",
      db: dbReady ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    },
  });
});
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/curriculum", curriculumRoutes);

const startServer = async (): Promise<void> => {
  await connectDB();
  await migrateScheduleRepeatField().catch((err) => {
    console.warn("Schedule repeat field migration skipped:", err);
  });
  await migrateSessionSlotIndexes().catch((err) => {
    console.warn("SessionSlot index migration skipped:", err);
  });
  await migrateParentAccountsToStudent().catch((err) => {
    console.warn("Parent→student migration skipped:", err);
  });
  await unsetStudentIdForNonStudents().catch((err) => {
    console.warn("Non-student studentId cleanup skipped:", err);
  });
  await verifySmtpConnection();
  if (process.env.SCHEDULE_RESYNC_ON_BOOT === "true") {
    await resyncAllClasses().catch((err) => {
      console.warn("Schedule resync skipped:", err);
    });
  }
  const { refreshCurriculumTree } = await import("./services/curriculumStore");
  await refreshCurriculumTree().catch((err) => {
    console.warn("Curriculum seed skipped:", err);
  });

  const { startSessionStatusCron } = await import("./jobs/sessionCron");
  startSessionStatusCron();

  const { startPaymentReminderCron } = await import("./jobs/paymentReminderCron");
  startPaymentReminderCron();

  const { startClassReminderCron } = await import("./jobs/classReminderCron");
  startClassReminderCron();

  const { startNoShowCron } = await import("./jobs/noShowCron");
  startNoShowCron();

  const { initSocketServer } = await import("./realtime/socketServer");
  const httpServer = http.createServer(app);
  initSocketServer(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (HTTP + Socket.IO)`);
  });
};

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

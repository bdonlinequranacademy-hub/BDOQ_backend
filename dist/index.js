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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./config/loadEnv");
require("./types/express");
const mongoose_1 = __importDefault(require("mongoose"));
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const passport_1 = __importDefault(require("passport"));
require("./config/passport");
const db_1 = __importDefault(require("./config/db"));
const cors_2 = require("./config/cors");
const env_1 = require("./config/env");
const emailService_1 = require("./services/emailService");
const scheduleService_1 = require("./services/scheduleService");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const studentRoutes_1 = __importDefault(require("./routes/studentRoutes"));
const teacherRoutes_1 = __importDefault(require("./routes/teacherRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const parentRoutes_1 = __importDefault(require("./routes/parentRoutes"));
const blogRoutes_1 = __importDefault(require("./routes/blogRoutes"));
const resourceRoutes_1 = __importDefault(require("./routes/resourceRoutes"));
const searchRoutes_1 = __importDefault(require("./routes/searchRoutes"));
const publicRoutes_1 = __importDefault(require("./routes/publicRoutes"));
const curriculumRoutes_1 = __importDefault(require("./routes/curriculumRoutes"));
const roleMigrationService_1 = require("./services/roleMigrationService");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
(0, env_1.validateEnv)();
app.use((0, cors_1.default)((0, cors_2.createCorsOptions)()));
app.use(express_1.default.json());
app.use(passport_1.default.initialize());
app.get("/api/health", (_req, res) => {
    const dbReady = mongoose_1.default.connection.readyState === 1;
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
app.use("/api/auth", authRoutes_1.default);
app.use("/api/student", studentRoutes_1.default);
app.use("/api/teacher", teacherRoutes_1.default);
app.use("/api/admin", adminRoutes_1.default);
app.use("/api/parent", parentRoutes_1.default);
app.use("/api/blog", blogRoutes_1.default);
app.use("/api/resources", resourceRoutes_1.default);
app.use("/api/search", searchRoutes_1.default);
app.use("/api/public", publicRoutes_1.default);
app.use("/api/curriculum", curriculumRoutes_1.default);
const startServer = async () => {
    await (0, db_1.default)();
    await (0, scheduleService_1.migrateScheduleRepeatField)().catch((err) => {
        console.warn("Schedule repeat field migration skipped:", err);
    });
    await (0, scheduleService_1.migrateSessionSlotIndexes)().catch((err) => {
        console.warn("SessionSlot index migration skipped:", err);
    });
    await (0, roleMigrationService_1.migrateParentAccountsToStudent)().catch((err) => {
        console.warn("Parent→student migration skipped:", err);
    });
    await (0, roleMigrationService_1.unsetStudentIdForNonStudents)().catch((err) => {
        console.warn("Non-student studentId cleanup skipped:", err);
    });
    await (0, emailService_1.verifySmtpConnection)();
    if (process.env.SCHEDULE_RESYNC_ON_BOOT === "true") {
        await (0, scheduleService_1.resyncAllClasses)().catch((err) => {
            console.warn("Schedule resync skipped:", err);
        });
    }
    const { refreshCurriculumTree } = await Promise.resolve().then(() => __importStar(require("./services/curriculumStore")));
    await refreshCurriculumTree().catch((err) => {
        console.warn("Curriculum seed skipped:", err);
    });
    const { startSessionStatusCron } = await Promise.resolve().then(() => __importStar(require("./jobs/sessionCron")));
    startSessionStatusCron();
    const { startPaymentReminderCron } = await Promise.resolve().then(() => __importStar(require("./jobs/paymentReminderCron")));
    startPaymentReminderCron();
    const { startClassReminderCron } = await Promise.resolve().then(() => __importStar(require("./jobs/classReminderCron")));
    startClassReminderCron();
    const { initSocketServer } = await Promise.resolve().then(() => __importStar(require("./realtime/socketServer")));
    const httpServer = http_1.default.createServer(app);
    initSocketServer(httpServer);
    httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT} (HTTP + Socket.IO)`);
    });
};
startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});

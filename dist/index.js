"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./config/loadEnv");
require("./types/express");
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
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
const parentRoutes_1 = __importDefault(require("./routes/parentRoutes"));
const blogRoutes_1 = __importDefault(require("./routes/blogRoutes"));
const searchRoutes_1 = __importDefault(require("./routes/searchRoutes"));
const publicRoutes_1 = __importDefault(require("./routes/publicRoutes"));
const roleMigrationService_1 = require("./services/roleMigrationService");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
(0, env_1.validateEnv)();
app.use((0, cors_1.default)((0, cors_2.createCorsOptions)()));
app.use(express_1.default.json());
app.use(passport_1.default.initialize());
app.get("/api/health", (_req, res) => {
    res.json({
        success: true,
        message: "OK",
        data: { service: "myacademy-api", timestamp: new Date().toISOString() },
    });
});
app.use("/api/auth", authRoutes_1.default);
app.use("/api/student", studentRoutes_1.default);
app.use("/api/teacher", teacherRoutes_1.default);
app.use("/api/admin", adminRoutes_1.default);
app.use("/api/ai", aiRoutes_1.default);
app.use("/api/parent", parentRoutes_1.default);
app.use("/api/blog", blogRoutes_1.default);
app.use("/api/search", searchRoutes_1.default);
app.use("/api/public", publicRoutes_1.default);
const startServer = async () => {
    await (0, db_1.default)();
    await (0, roleMigrationService_1.migrateParentAccountsToStudent)().catch((err) => {
        console.warn("Parent→student migration skipped:", err);
    });
    await (0, emailService_1.verifySmtpConnection)();
    await (0, scheduleService_1.resyncAllClasses)().catch((err) => {
        console.warn("Schedule resync skipped:", err);
    });
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};
startServer();

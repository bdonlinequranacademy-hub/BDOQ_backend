"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resyncAdminSchedule = exports.getAdminWeeklyRoutine = void 0;
const scheduleService_1 = require("../services/scheduleService");
const getAdminWeeklyRoutine = async (req, res) => {
    try {
        const teacherId = typeof req.query.teacherId === "string" && req.query.teacherId.trim()
            ? req.query.teacherId.trim()
            : undefined;
        const sessions = await (0, scheduleService_1.getAcademyWeeklyRoutine)(teacherId);
        res.status(200).json({
            success: true,
            message: "Academy routine fetched successfully",
            data: sessions,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch academy routine",
            data: null,
        });
    }
};
exports.getAdminWeeklyRoutine = getAdminWeeklyRoutine;
const resyncAdminSchedule = async (_req, res) => {
    try {
        const count = await (0, scheduleService_1.resyncAllClasses)();
        res.status(200).json({
            success: true,
            message: `Resynced ${count} active class${count === 1 ? "" : "es"}`,
            data: { classesSynced: count },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to resync schedule",
            data: null,
        });
    }
};
exports.resyncAdminSchedule = resyncAdminSchedule;

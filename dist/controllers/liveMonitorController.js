"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicLiveDashboardHandler = exports.getAdminLiveMonitor = void 0;
const liveMonitorService_1 = require("../services/liveMonitorService");
const getAdminLiveMonitor = async (_req, res) => {
    try {
        const data = await (0, liveMonitorService_1.getLiveMonitorPayload)();
        res.status(200).json({
            success: true,
            message: "Live monitor data fetched successfully",
            data,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch live monitor data",
            data: null,
        });
    }
};
exports.getAdminLiveMonitor = getAdminLiveMonitor;
/** Public marketing snapshot — no auth, no meeting links or PII. */
const getPublicLiveDashboardHandler = async (_req, res) => {
    try {
        const data = await (0, liveMonitorService_1.getPublicLiveDashboard)();
        res.status(200).json({
            success: true,
            message: "Live dashboard snapshot fetched successfully",
            data,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch live dashboard snapshot",
            data: null,
        });
    }
};
exports.getPublicLiveDashboardHandler = getPublicLiveDashboardHandler;

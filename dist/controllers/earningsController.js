"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminEarningsReport = exports.getTeacherEarningsReport = void 0;
const earningsService_1 = require("../services/earningsService");
function currentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
function parseMonth(value) {
    if (typeof value === "string" && /^\d{4}-\d{2}$/.test(value)) {
        return value;
    }
    return currentMonth();
}
const getTeacherEarningsReport = async (req, res) => {
    try {
        const month = parseMonth(req.query.month);
        const data = await (0, earningsService_1.getTeacherEarnings)(req.user._id, month);
        res.status(200).json({
            success: true,
            message: "Earnings report fetched successfully",
            data,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch earnings report",
            data: null,
        });
    }
};
exports.getTeacherEarningsReport = getTeacherEarningsReport;
const getAdminEarningsReport = async (req, res) => {
    try {
        const month = parseMonth(req.query.month);
        const data = await (0, earningsService_1.getAdminEarningsOverview)(month);
        res.status(200).json({
            success: true,
            message: "Earnings overview fetched successfully",
            data,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch earnings overview",
            data: null,
        });
    }
};
exports.getAdminEarningsReport = getAdminEarningsReport;

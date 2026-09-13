"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStudentId = generateStudentId;
const User_1 = require("../models/User");
async function generateStudentId() {
    // Find the highest existing studentId that matches the ABY-XXX pattern
    const lastUser = await User_1.User.findOne({ studentId: { $regex: /^ABY-\d+$/ } })
        .sort({ studentId: -1 })
        .select("studentId")
        .exec();
    if (lastUser && lastUser.studentId) {
        const match = lastUser.studentId.match(/^ABY-(\d+)$/);
        if (match) {
            const next = parseInt(match[1], 10) + 1;
            return `ABY-${String(next).padStart(3, "0")}`;
        }
    }
    // Fallback if no matching ID is found
    return "ABY-001";
}

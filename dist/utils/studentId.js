"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStudentId = generateStudentId;
const User_1 = require("../models/User");
async function generateStudentId() {
    const count = await User_1.User.countDocuments({ role: "student", studentId: { $exists: true, $ne: null } });
    const next = count + 1;
    return `ABY-${String(next).padStart(3, "0")}`;
}

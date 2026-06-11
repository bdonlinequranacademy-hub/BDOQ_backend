"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateParentAccountsToStudent = migrateParentAccountsToStudent;
const User_1 = require("../models/User");
const studentId_1 = require("../utils/studentId");
/** Legacy parent accounts are unified into student (guardian + learner one portal). */
async function migrateParentAccountsToStudent() {
    const parents = await User_1.User.find({ role: "parent" });
    for (const user of parents) {
        if (!user.studentId) {
            user.studentId = await (0, studentId_1.generateStudentId)();
        }
        user.role = "student";
        await user.save();
    }
    if (parents.length > 0) {
        console.log(`[roles] Migrated ${parents.length} legacy parent account(s) to student.`);
    }
    return parents.length;
}

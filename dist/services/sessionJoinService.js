"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordSessionJoin = recordSessionJoin;
exports.getJoinMapForDate = getJoinMapForDate;
exports.resolveJoinRoleForUser = resolveJoinRoleForUser;
exports.assertUserCanJoinSlot = assertUserCanJoinSlot;
const mongoose_1 = __importDefault(require("mongoose"));
const Attendance_1 = require("../models/Attendance");
const SessionJoin_1 = require("../models/SessionJoin");
const SessionSlot_1 = require("../models/SessionSlot");
const socketServer_1 = require("../realtime/socketServer");
const scheduleUtils_1 = require("../utils/scheduleUtils");
function getAcademyDateString(now = new Date()) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: scheduleUtils_1.ACADEMY_TIMEZONE,
    }).format(now);
}
function normalizeSessionDate(date) {
    if (date?.trim())
        return date.trim();
    return getAcademyDateString();
}
async function recordSessionJoin(input) {
    if (!mongoose_1.default.Types.ObjectId.isValid(input.sessionSlotId)) {
        throw new Error("Invalid session slot ID");
    }
    const slot = await SessionSlot_1.SessionSlot.findById(input.sessionSlotId);
    if (!slot?.isActive) {
        throw new Error("Session slot not found");
    }
    const sessionDate = normalizeSessionDate(input.sessionDate);
    const source = input.source ?? "meeting_link";
    const existing = await SessionJoin_1.SessionJoin.findOne({
        sessionSlot: slot._id,
        sessionDate,
        user: input.userId,
    });
    if (existing) {
        return {
            joinedAt: existing.joinedAt.toISOString(),
            alreadyJoined: true,
        };
    }
    const join = await SessionJoin_1.SessionJoin.create({
        sessionSlot: slot._id,
        sessionDate,
        user: input.userId,
        role: input.role,
        source,
        joinedAt: new Date(),
    });
    await autoMarkAttendancePresent({
        classId: slot.class,
        studentId: slot.student,
        role: input.role,
        sessionDate,
    });
    (0, socketServer_1.emitAdminLiveMonitorUpdate)();
    return {
        joinedAt: join.joinedAt.toISOString(),
        alreadyJoined: false,
    };
}
async function autoMarkAttendancePresent(input) {
    if (input.role !== "student")
        return;
    const attendanceDate = new Date(`${input.sessionDate}T00:00:00.000Z`);
    await Attendance_1.Attendance.findOneAndUpdate({
        class: input.classId,
        student: input.studentId,
        date: attendanceDate,
    }, {
        $setOnInsert: {
            class: input.classId,
            student: input.studentId,
            date: attendanceDate,
        },
        $set: {
            status: "present",
        },
    }, { upsert: true, new: true });
}
async function getJoinMapForDate(sessionDate) {
    const joins = await SessionJoin_1.SessionJoin.find({ sessionDate }).lean();
    const map = new Map();
    for (const join of joins) {
        const key = join.sessionSlot.toString();
        const entry = map.get(key) ?? {};
        const joinedAt = join.joinedAt.toISOString();
        if (join.role === "teacher") {
            entry.teacherJoinedAt = joinedAt;
        }
        else {
            entry.studentJoinedAt = joinedAt;
        }
        map.set(key, entry);
    }
    return map;
}
function resolveJoinRoleForUser(slot, user) {
    const userId = user._id.toString();
    if (slot.teacher.toString() === userId)
        return "teacher";
    if (slot.student.toString() === userId)
        return "student";
    if (user.role === "admin" || user.role === "super_admin")
        return null;
    return null;
}
async function assertUserCanJoinSlot(sessionSlotId, user) {
    const slot = await SessionSlot_1.SessionSlot.findById(sessionSlotId);
    if (!slot?.isActive) {
        throw new Error("Session slot not found");
    }
    const role = resolveJoinRoleForUser(slot, user);
    if (!role) {
        throw new Error("You are not assigned to this session");
    }
    return { slot, role };
}

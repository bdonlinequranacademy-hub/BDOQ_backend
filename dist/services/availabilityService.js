"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkTeacherAvailability = checkTeacherAvailability;
const SessionSlot_1 = require("../models/SessionSlot");
const User_1 = require("../models/User");
const scheduleUtils_1 = require("../utils/scheduleUtils");
const VALID_DAYS = [
    "Saturday",
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
];
function parseTimeToMinutes(timeStr) {
    const cleaned = timeStr.split(/[–—-]/)[0].trim();
    const match = cleaned.match(/^(\d{1,2}):(\d{2})/);
    if (!match)
        return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59)
        return null;
    return hours * 60 + minutes;
}
function minutesToTime24(total) {
    const h = Math.floor(total / 60) % 24;
    const m = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function rangesOverlap(startA, endA, startB, endB) {
    return startA < endB && startB < endA;
}
async function checkTeacherAvailability(teacherId, day, startTime, durationMinutes) {
    if (!VALID_DAYS.includes(day)) {
        throw new Error("INVALID_DAY");
    }
    const startMinutes = parseTimeToMinutes(startTime);
    if (startMinutes === null || durationMinutes < 15) {
        throw new Error("INVALID_TIME");
    }
    const endMinutes = startMinutes + durationMinutes;
    if (endMinutes > 24 * 60) {
        throw new Error("INVALID_TIME");
    }
    const teacher = await User_1.User.findById(teacherId).select("timezone name");
    const teacherTz = teacher?.timezone || scheduleUtils_1.ACADEMY_TIMEZONE;
    const slots = await SessionSlot_1.SessionSlot.find({
        teacher: teacherId,
        day,
        isActive: true,
    }).populate("student", "name");
    const conflicts = [];
    for (const slot of slots) {
        const slotStart = parseTimeToMinutes(slot.startTime);
        if (slotStart === null)
            continue;
        const slotEnd = slotStart + slot.durationMinutes;
        if (rangesOverlap(startMinutes, endMinutes, slotStart, slotEnd)) {
            const student = slot.student;
            conflicts.push({
                slotId: slot._id.toString(),
                studentName: student.name ?? "Student",
                startTime: slot.startTime,
                endTime: minutesToTime24(slotEnd),
                durationMinutes: slot.durationMinutes,
            });
        }
    }
    const time24 = minutesToTime24(startMinutes);
    return {
        available: conflicts.length === 0,
        day,
        startTime: time24,
        durationMinutes,
        timezone: scheduleUtils_1.ACADEMY_TIMEZONE,
        displayTime: {
            academy: (0, scheduleUtils_1.formatWeeklyTime)(day, time24, scheduleUtils_1.ACADEMY_TIMEZONE),
            teacher: (0, scheduleUtils_1.formatWeeklyTime)(day, time24, teacherTz),
        },
        conflicts,
    };
}

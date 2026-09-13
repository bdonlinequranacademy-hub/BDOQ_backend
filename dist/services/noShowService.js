"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runNoShowChecks = runNoShowChecks;
const Attendance_1 = require("../models/Attendance");
const SessionAlertLog_1 = require("../models/SessionAlertLog");
const SessionSlot_1 = require("../models/SessionSlot");
const notificationService_1 = require("./notificationService");
const sessionJoinService_1 = require("./sessionJoinService");
const socketServer_1 = require("../realtime/socketServer");
const smsService_1 = require("./smsService");
const scheduleUtils_1 = require("../utils/scheduleUtils");
const TEACHER_LATE_MINUTES = 5;
const STUDENT_NO_SHOW_MINUTES = 10;
function getAcademyDateString(now = new Date()) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: scheduleUtils_1.ACADEMY_TIMEZONE,
    }).format(now);
}
function populatedUser(value) {
    if (!value || typeof value !== "object" || !("name" in value))
        return null;
    return value;
}
function populatedClass(value) {
    if (!value || typeof value !== "object" || !("title" in value))
        return null;
    return value;
}
async function alertAlreadySent(sessionSlotId, sessionDate, alertType) {
    const existing = await SessionAlertLog_1.SessionAlertLog.findOne({
        sessionSlot: sessionSlotId,
        sessionDate,
        alertType,
    });
    return Boolean(existing);
}
async function markAlertSent(sessionSlotId, sessionDate, alertType) {
    await SessionAlertLog_1.SessionAlertLog.create({
        sessionSlot: sessionSlotId,
        sessionDate,
        alertType,
    }).catch(() => {
        /* duplicate race — ignore */
    });
}
async function autoMarkAbsent(input) {
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
        $set: { status: "absent" },
    }, { upsert: true });
}
async function runNoShowChecks() {
    const now = new Date();
    const day = (0, scheduleUtils_1.getTodayScheduleDay)();
    const sessionDate = getAcademyDateString(now);
    const joinMap = await (0, sessionJoinService_1.getJoinMapForDate)(sessionDate);
    const slots = await SessionSlot_1.SessionSlot.find({ day, isActive: true })
        .populate("class", "title isActive")
        .populate("teacher", "name email isActive whatsapp")
        .populate("student", "name email isActive whatsapp");
    let alertsSent = 0;
    for (const slot of slots) {
        const classDoc = populatedClass(slot.class);
        const teacher = populatedUser(slot.teacher);
        const student = populatedUser(slot.student);
        if (!classDoc || classDoc.isActive === false || !teacher?.isActive || !student?.isActive) {
            continue;
        }
        const startsAt = (0, scheduleUtils_1.getSessionInstant)(slot.day, slot.startTime);
        if (!startsAt)
            continue;
        const phase = slot.sessionPhase ?? (0, scheduleUtils_1.getSessionPhase)(startsAt, slot.durationMinutes, now);
        const minutesSinceStart = (now.getTime() - startsAt.getTime()) / 60000;
        const joins = joinMap.get(slot._id.toString()) ?? {};
        const startTime = (0, scheduleUtils_1.normalizeScheduleTime)(slot.startTime) ?? slot.startTime;
        const timeLabel = (0, scheduleUtils_1.formatWeeklyTime)(slot.day, startTime, scheduleUtils_1.ACADEMY_TIMEZONE, scheduleUtils_1.ACADEMY_TIMEZONE);
        const slotId = slot._id.toString();
        if (phase === "live" &&
            minutesSinceStart >= TEACHER_LATE_MINUTES &&
            !joins.teacherJoinedAt &&
            !(await alertAlreadySent(slotId, sessionDate, "teacher_late"))) {
            await markAlertSent(slotId, sessionDate, "teacher_late");
            const msg = `${teacher.name} has not joined "${classDoc.title}" with ${student.name} (${timeLabel}). Class started ${Math.floor(minutesSinceStart)} min ago.`;
            await (0, notificationService_1.notifyAdmins)("Teacher late", msg, "class");
            await (0, notificationService_1.createUserNotification)({
                userId: teacher._id,
                title: "Class started — please join",
                message: `Your class "${classDoc.title}" with ${student.name} started at ${timeLabel}. Please join the meeting now.`,
                type: "class",
            });
            alertsSent += 1;
        }
        if ((phase === "live" || phase === "completed") &&
            minutesSinceStart >= STUDENT_NO_SHOW_MINUTES &&
            !joins.studentJoinedAt &&
            !(await alertAlreadySent(slotId, sessionDate, "student_no_show"))) {
            await markAlertSent(slotId, sessionDate, "student_no_show");
            const msg = `${student.name} has not joined "${classDoc.title}" with ${teacher.name} (${timeLabel}).`;
            await (0, notificationService_1.notifyAdmins)("Student no-show", msg, "class");
            await (0, notificationService_1.createUserNotification)({
                userId: student._id,
                title: "Class in progress — please join",
                message: `Your class "${classDoc.title}" with ${teacher.name} is in progress. Please join now.`,
                type: "class",
            });
            alertsSent += 1;
        }
        if (phase === "completed" &&
            !joins.teacherJoinedAt &&
            !(await alertAlreadySent(slotId, sessionDate, "teacher_no_show"))) {
            await markAlertSent(slotId, sessionDate, "teacher_no_show");
            const msg = `${teacher.name} did not join "${classDoc.title}" with ${student.name} (${timeLabel}).`;
            await (0, notificationService_1.notifyAdmins)("Teacher no-show", msg, "class");
            if ((0, smsService_1.isSmsConfigured)() && student.whatsapp) {
                const smsMessage = "Sorry, your teacher hasn't joined the class yet. Our team has been notified and will assist you shortly. - BDOQ Academy";
                (0, smsService_1.sendSMS)(student.whatsapp, smsMessage)
                    .then((res) => {
                    if (!res.success)
                        console.warn(`[SMS Warning] Teacher no-show SMS to ${student.whatsapp} failed: ${res.message}`);
                })
                    .catch((err) => {
                    console.warn(`[SMS Error] Exception sending teacher no-show SMS to ${student.whatsapp}:`, err instanceof Error ? err.message : err);
                });
            }
            alertsSent += 1;
        }
        if (phase === "completed" && !joins.studentJoinedAt) {
            await autoMarkAbsent({
                classId: slot.class.toString(),
                studentId: slot.student.toString(),
                sessionDate,
            });
        }
    }
    if (alertsSent > 0) {
        (0, socketServer_1.emitAdminLiveMonitorUpdate)();
        console.log(`[no-show] sent ${alertsSent} alert(s)`);
    }
    return alertsSent;
}

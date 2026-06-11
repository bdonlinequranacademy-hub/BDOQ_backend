"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncSlotsFromClass = syncSlotsFromClass;
exports.getTeacherTodaySchedule = getTeacherTodaySchedule;
exports.getTeacherWeeklyRoutine = getTeacherWeeklyRoutine;
exports.getStudentTodaySchedule = getStudentTodaySchedule;
exports.getAcademyWeeklyRoutine = getAcademyWeeklyRoutine;
exports.resyncAllClasses = resyncAllClasses;
const Class_1 = require("../models/Class");
const SessionSlot_1 = require("../models/SessionSlot");
const scheduleUtils_1 = require("../utils/scheduleUtils");
function formatSlot(slot, student, teacher, classDoc) {
    const studentTz = student.timezone || "UTC";
    const teacherTz = teacher.timezone || scheduleUtils_1.ACADEMY_TIMEZONE;
    const day = slot.day;
    return {
        _id: slot._id.toString(),
        classId: classDoc._id.toString(),
        classTitle: classDoc.title,
        courseType: slot.courseType || classDoc.title,
        durationMinutes: slot.durationMinutes,
        durationLabel: (0, scheduleUtils_1.formatDuration)(slot.durationMinutes),
        day: slot.day,
        meetingLink: classDoc.meetingLink,
        student: {
            _id: student._id.toString(),
            name: student.name,
            studentId: student.studentId ?? undefined,
            country: student.country ?? undefined,
            timezone: studentTz,
        },
        teacher: {
            _id: teacher._id.toString(),
            name: teacher.name,
            timezone: teacherTz,
        },
        times: {
            academy: {
                label: "BD",
                time: (0, scheduleUtils_1.formatWeeklyTime)(day, slot.startTime, scheduleUtils_1.ACADEMY_TIMEZONE),
                timezone: scheduleUtils_1.ACADEMY_TIMEZONE,
            },
            teacher: {
                label: "Tea",
                time: (0, scheduleUtils_1.formatWeeklyTime)(day, slot.startTime, teacherTz),
                timezone: teacherTz,
            },
            student: {
                label: "Stu",
                time: (0, scheduleUtils_1.formatWeeklyTime)(day, slot.startTime, studentTz),
                timezone: studentTz,
            },
        },
    };
}
async function syncSlotsFromClass(classDoc) {
    if (!classDoc.schedule || classDoc.isActive === false) {
        await SessionSlot_1.SessionSlot.updateMany({ class: classDoc._id }, { isActive: false });
        return;
    }
    await SessionSlot_1.SessionSlot.updateMany({ class: classDoc._id, student: { $nin: classDoc.students } }, { isActive: false });
    for (const studentId of classDoc.students) {
        await SessionSlot_1.SessionSlot.findOneAndUpdate({ class: classDoc._id, student: studentId }, {
            teacher: classDoc.teacher,
            day: classDoc.schedule.day,
            startTime: classDoc.schedule.time,
            durationMinutes: classDoc.schedule.duration || 60,
            courseType: classDoc.title,
            isActive: true,
        }, { upsert: true, new: true });
    }
}
async function getTeacherTodaySchedule(teacherId) {
    const today = (0, scheduleUtils_1.getTodayScheduleDay)();
    const slots = await SessionSlot_1.SessionSlot.find({
        teacher: teacherId,
        day: today,
        isActive: true,
    })
        .populate("student", "name timezone country studentId")
        .populate("teacher", "name timezone")
        .populate("class", "title meetingLink")
        .sort({ startTime: 1 });
    return slots.map((slot) => formatSlot(slot, slot.student, slot.teacher, slot.class));
}
async function getTeacherWeeklyRoutine(teacherId) {
    const slots = await SessionSlot_1.SessionSlot.find({
        teacher: teacherId,
        isActive: true,
    })
        .populate("student", "name timezone country studentId")
        .populate("teacher", "name timezone")
        .populate("class", "title meetingLink")
        .sort({ day: 1, startTime: 1 });
    return slots.map((slot) => formatSlot(slot, slot.student, slot.teacher, slot.class));
}
async function getStudentTodaySchedule(studentId) {
    const today = (0, scheduleUtils_1.getTodayScheduleDay)();
    const slots = await SessionSlot_1.SessionSlot.find({
        student: studentId,
        day: today,
        isActive: true,
    })
        .populate("student", "name timezone country studentId")
        .populate("teacher", "name timezone")
        .populate("class", "title meetingLink")
        .sort({ startTime: 1 });
    return slots.map((slot) => formatSlot(slot, slot.student, slot.teacher, slot.class));
}
async function getAcademyWeeklyRoutine(teacherId) {
    const filter = { isActive: true };
    if (teacherId) {
        filter.teacher = teacherId;
    }
    const slots = await SessionSlot_1.SessionSlot.find(filter)
        .populate("student", "name timezone country studentId")
        .populate("teacher", "name timezone")
        .populate("class", "title meetingLink")
        .sort({ day: 1, startTime: 1 });
    return slots.map((slot) => formatSlot(slot, slot.student, slot.teacher, slot.class));
}
async function resyncAllClasses() {
    const classes = await Class_1.Class.find({ isActive: true });
    for (const classDoc of classes) {
        await syncSlotsFromClass(classDoc);
    }
    return classes.length;
}

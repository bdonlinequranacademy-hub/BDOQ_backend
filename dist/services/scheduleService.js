"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const SLOT_POPULATE = [
    { path: "student", select: "name timezone country studentId" },
    { path: "teacher", select: "name timezone country" },
    { path: "class", select: "title meetingLink" },
];
function snapshotSlotRefs(slot) {
    return {
        student: slot.get("student"),
        teacher: slot.get("teacher"),
        class: slot.get("class"),
    };
}
function resolvePopulatedUser(ref, populated, fallbackName) {
    const user = populated;
    if (user?._id)
        return user;
    return {
        _id: ref,
        name: fallbackName,
        timezone: "UTC",
    };
}
function resolvePopulatedClass(ref, populated) {
    const classDoc = populated;
    if (classDoc?._id)
        return classDoc;
    return {
        _id: ref,
        title: "Deleted class",
    };
}
function formatSlot(slot, refs) {
    const student = resolvePopulatedUser(refs.student, slot.student, "Deleted student");
    const teacher = resolvePopulatedUser(refs.teacher, slot.teacher, "Deleted teacher");
    const classDoc = resolvePopulatedClass(refs.class, slot.class);
    const studentTz = student.timezone || "UTC";
    const teacherTz = teacher.timezone || scheduleUtils_1.ACADEMY_TIMEZONE;
    const day = slot.day;
    const startsAt = (0, scheduleUtils_1.getSessionInstant)(day, slot.startTime) ?? new Date();
    const endsAt = new Date(startsAt.getTime() + slot.durationMinutes * 60000);
    const sessionPhase = (0, scheduleUtils_1.getSessionPhase)(startsAt, slot.durationMinutes);
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
            country: teacher.country ?? undefined,
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
        sessionPhase,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
    };
}
async function mapFormattedSlots(slots) {
    if (slots.length === 0)
        return [];
    const refs = slots.map(snapshotSlotRefs);
    await SessionSlot_1.SessionSlot.populate(slots, [...SLOT_POPULATE]);
    return slots.map((slot, index) => formatSlot(slot, refs[index]));
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
    const { refreshSessionPhaseForClass } = await Promise.resolve().then(() => __importStar(require("./sessionStatusService")));
    await refreshSessionPhaseForClass(classDoc._id.toString()).catch(() => undefined);
}
async function getTeacherTodaySchedule(teacherId) {
    const today = (0, scheduleUtils_1.getTodayScheduleDay)();
    const slots = await SessionSlot_1.SessionSlot.find({
        teacher: teacherId,
        day: today,
        isActive: true,
    }).sort({ startTime: 1 });
    return mapFormattedSlots(slots);
}
async function getTeacherWeeklyRoutine(teacherId) {
    const slots = await SessionSlot_1.SessionSlot.find({
        teacher: teacherId,
        isActive: true,
    }).sort({ day: 1, startTime: 1 });
    return mapFormattedSlots(slots);
}
async function getStudentTodaySchedule(studentId) {
    const today = (0, scheduleUtils_1.getTodayScheduleDay)();
    const slots = await SessionSlot_1.SessionSlot.find({
        student: studentId,
        day: today,
        isActive: true,
    }).sort({ startTime: 1 });
    return mapFormattedSlots(slots);
}
async function getAcademyWeeklyRoutine(teacherId) {
    const filter = { isActive: true };
    if (teacherId) {
        filter.teacher = teacherId;
    }
    const slots = await SessionSlot_1.SessionSlot.find(filter).sort({ day: 1, startTime: 1 });
    return mapFormattedSlots(slots);
}
async function resyncAllClasses() {
    const classes = await Class_1.Class.find({ isActive: true });
    for (const classDoc of classes) {
        await syncSlotsFromClass(classDoc);
    }
    return classes.length;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultMonthlyQuestions = getDefaultMonthlyQuestions;
exports.upsertMonthlyProgress = upsertMonthlyProgress;
exports.listTeacherMonthlyProgress = listTeacherMonthlyProgress;
exports.listStudentMonthlyProgress = listStudentMonthlyProgress;
exports.listAdminMonthlyProgress = listAdminMonthlyProgress;
const ClassLog_1 = require("../models/ClassLog");
const MonthlyProgressSnapshot_1 = require("../models/MonthlyProgressSnapshot");
const Progress_1 = require("../models/Progress");
const Class_1 = require("../models/Class");
function formatSnapshot(doc) {
    const student = doc.student;
    const teacher = doc.teacher;
    const classDoc = doc.class;
    return {
        _id: doc._id.toString(),
        month: doc.month,
        student: {
            _id: student._id.toString(),
            name: student.name,
            studentId: student.studentId ?? undefined,
        },
        class: {
            _id: classDoc._id.toString(),
            title: classDoc.title,
        },
        teacher: {
            _id: teacher._id.toString(),
            name: teacher.name,
        },
        surahsCompleted: doc.surahsCompleted,
        tajweedScore: doc.tajweedScore,
        memorizedAyahs: doc.memorizedAyahs,
        teacherSummary: doc.teacherSummary,
        qaResponses: doc.qaResponses,
        activityDates: doc.activityDates,
        sessionsHeld: doc.sessionsHeld,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}
async function assertTeacherStudentClass(teacherId, studentId, classId) {
    const classDoc = await Class_1.Class.findOne({
        _id: classId,
        teacher: teacherId,
        students: studentId,
    });
    if (!classDoc) {
        throw new Error("CLASS_ACCESS_DENIED");
    }
    return classDoc;
}
async function gatherMonthActivity(teacherId, studentId, month) {
    const logs = await ClassLog_1.ClassLog.find({
        teacher: teacherId,
        student: studentId,
        status: "approved",
        sessionDate: { $regex: `^${month}` },
    }).select("sessionDate");
    const dates = [...new Set(logs.map((l) => l.sessionDate))].sort();
    return { activityDates: dates, sessionsHeld: logs.length };
}
function getDefaultMonthlyQuestions() {
    return [...MonthlyProgressSnapshot_1.DEFAULT_MONTHLY_QUESTIONS];
}
async function upsertMonthlyProgress(input) {
    await assertTeacherStudentClass(input.teacherId, input.studentId, input.classId);
    const progress = await Progress_1.Progress.findOne({
        student: input.studentId,
        class: input.classId,
    });
    const activity = await gatherMonthActivity(input.teacherId, input.studentId, input.month);
    const qaResponses = input.qaResponses && input.qaResponses.length > 0
        ? input.qaResponses
        : MonthlyProgressSnapshot_1.DEFAULT_MONTHLY_QUESTIONS.map((question) => ({ question, answer: "" }));
    const doc = await MonthlyProgressSnapshot_1.MonthlyProgressSnapshot.findOneAndUpdate({
        student: input.studentId,
        class: input.classId,
        month: input.month,
    }, {
        teacher: input.teacherId,
        surahsCompleted: progress?.surahsCompleted ?? [],
        tajweedScore: progress?.tajweedScore ?? 0,
        memorizedAyahs: progress?.memorizedAyahs ?? 0,
        teacherSummary: input.teacherSummary?.trim() || progress?.notes || "",
        qaResponses,
        activityDates: activity.activityDates,
        sessionsHeld: activity.sessionsHeld,
        createdBy: input.teacherId,
    }, { upsert: true, new: true, runValidators: true })
        .populate("student", "name studentId")
        .populate("teacher", "name")
        .populate("class", "title");
    return formatSnapshot(doc);
}
async function listTeacherMonthlyProgress(teacherId, month) {
    const filter = { teacher: teacherId };
    if (month)
        filter.month = month;
    const docs = await MonthlyProgressSnapshot_1.MonthlyProgressSnapshot.find(filter)
        .populate("student", "name studentId")
        .populate("teacher", "name")
        .populate("class", "title")
        .sort({ month: -1, updatedAt: -1 });
    return docs.map(formatSnapshot);
}
async function listStudentMonthlyProgress(studentId, month) {
    const filter = { student: studentId };
    if (month)
        filter.month = month;
    const docs = await MonthlyProgressSnapshot_1.MonthlyProgressSnapshot.find(filter)
        .populate("student", "name studentId")
        .populate("teacher", "name")
        .populate("class", "title")
        .sort({ month: -1 });
    return docs.map(formatSnapshot);
}
async function listAdminMonthlyProgress(month) {
    const filter = {};
    if (month)
        filter.month = month;
    const docs = await MonthlyProgressSnapshot_1.MonthlyProgressSnapshot.find(filter)
        .populate("student", "name studentId")
        .populate("teacher", "name")
        .populate("class", "title")
        .sort({ month: -1, updatedAt: -1 });
    return docs.map(formatSnapshot);
}

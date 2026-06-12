"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStudentRequest = createStudentRequest;
exports.listTeacherStudentRequests = listTeacherStudentRequests;
exports.listAdminStudentRequests = listAdminStudentRequests;
exports.resolveStudentRequest = resolveStudentRequest;
const StudentRequest_1 = require("../models/StudentRequest");
const User_1 = require("../models/User");
const notificationService_1 = require("./notificationService");
function formatRequest(doc) {
    const teacher = doc.teacher;
    return {
        _id: doc._id.toString(),
        message: doc.message,
        preferredCourseType: doc.preferredCourseType,
        status: doc.status,
        adminNote: doc.adminNote,
        resolvedAt: doc.resolvedAt?.toISOString(),
        createdAt: doc.createdAt.toISOString(),
        teacher: {
            _id: teacher._id.toString(),
            name: teacher.name ?? "Teacher",
            email: teacher.email,
        },
    };
}
async function notifyAdmins(title, message) {
    await (0, notificationService_1.notifyAdmins)(title, message, "general");
}
async function createStudentRequest(teacherId, message, preferredCourseType) {
    const teacher = await User_1.User.findById(teacherId).select("name");
    const doc = await StudentRequest_1.StudentRequest.create({
        teacher: teacherId,
        message: message.trim(),
        preferredCourseType: preferredCourseType?.trim() || undefined,
        status: "pending",
    });
    await notifyAdmins("New student assignment request", `${teacher?.name ?? "A teacher"} requested a new student assignment.`);
    const populated = await StudentRequest_1.StudentRequest.findById(doc._id).populate("teacher", "name email");
    return formatRequest(populated);
}
async function listTeacherStudentRequests(teacherId) {
    const docs = await StudentRequest_1.StudentRequest.find({ teacher: teacherId })
        .populate("teacher", "name email")
        .sort({ createdAt: -1 });
    return docs.map(formatRequest);
}
async function listAdminStudentRequests(status) {
    const filter = {};
    if (status)
        filter.status = status;
    const docs = await StudentRequest_1.StudentRequest.find(filter)
        .populate("teacher", "name email")
        .sort({ createdAt: -1 });
    return docs.map(formatRequest);
}
async function resolveStudentRequest(requestId, adminId, status, adminNote) {
    const doc = await StudentRequest_1.StudentRequest.findByIdAndUpdate(requestId, {
        status,
        adminNote: adminNote?.trim() || undefined,
        resolvedBy: adminId,
        resolvedAt: new Date(),
    }, { new: true }).populate("teacher", "name email");
    if (!doc)
        return null;
    await (0, notificationService_1.createUserNotification)({
        userId: doc.teacher,
        title: status === "approved"
            ? "Student request approved"
            : "Student request declined",
        message: status === "approved"
            ? "Admin approved your request for a new student. They may assign students soon."
            : adminNote?.trim() || "Your student assignment request was declined.",
        type: "general",
    });
    return formatRequest(doc);
}

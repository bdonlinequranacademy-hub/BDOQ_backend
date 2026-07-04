"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNextInvoiceNumber = generateNextInvoiceNumber;
exports.ensureInvoiceNumber = ensureInvoiceNumber;
exports.buildPaymentInvoice = buildPaymentInvoice;
const Class_1 = require("../models/Class");
const PaymentRecord_1 = require("../models/PaymentRecord");
const User_1 = require("../models/User");
const academyBrand_1 = require("../lib/academyBrand");
function formatSchedule(day, time, duration) {
    return `${day}, ${time} (${duration} min)`;
}
async function generateNextInvoiceNumber() {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const count = await PaymentRecord_1.PaymentRecord.countDocuments({
        invoiceNumber: { $regex: `^${prefix}` },
    });
    return `${prefix}${String(count + 1).padStart(4, "0")}`;
}
async function ensureInvoiceNumber(record) {
    if (record.invoiceNumber) {
        return record.invoiceNumber;
    }
    const invoiceNumber = await generateNextInvoiceNumber();
    record.invoiceNumber = invoiceNumber;
    await record.save();
    return invoiceNumber;
}
async function loadStudentCourses(studentId) {
    const classes = await Class_1.Class.find({
        students: studentId,
        isActive: true,
    })
        .populate("teacher", "name")
        .sort({ title: 1 })
        .limit(5);
    return classes.map((cls) => {
        const teacherDoc = cls.teacher;
        let teacherName = "Assigned teacher";
        if (teacherDoc &&
            typeof teacherDoc === "object" &&
            "name" in teacherDoc &&
            typeof teacherDoc.name === "string") {
            teacherName = teacherDoc.name;
        }
        const schedule = cls.schedule?.day && cls.schedule?.time
            ? formatSchedule(cls.schedule.day, cls.schedule.time, cls.schedule.duration ?? 60)
            : undefined;
        return {
            title: cls.title,
            teacherName,
            schedule,
        };
    });
}
async function buildPaymentInvoice(paymentId) {
    const record = await PaymentRecord_1.PaymentRecord.findById(paymentId);
    if (!record || record.status !== "approved") {
        return null;
    }
    const student = await User_1.User.findById(record.student).select("name email studentId country");
    if (!student) {
        return null;
    }
    const invoiceNumber = await ensureInvoiceNumber(record);
    const courses = await loadStudentCourses(student._id.toString());
    const monthLabel = record.monthsCovered === 1
        ? "1 month"
        : `${record.monthsCovered} months`;
    return {
        invoiceNumber,
        paymentId: record._id.toString(),
        issuedAt: (record.reviewedAt ?? record.updatedAt).toISOString(),
        student: {
            name: student.name,
            email: student.email,
            studentId: student.studentId ?? undefined,
            country: record.country || student.country || "",
        },
        academy: academyBrand_1.ACADEMY_BRAND,
        description: `Quran tuition fee — ${monthLabel}`,
        monthsCovered: record.monthsCovered,
        amount: record.amount,
        currency: record.currency,
        transactionFee: record.transactionFee,
        netAmount: record.netAmount,
        method: record.method,
        reference: record.reference,
        paymentDate: record.paymentDate.toISOString(),
        paidUntilAfter: record.paidUntilAfter?.toISOString(),
        note: record.note,
        courses,
    };
}

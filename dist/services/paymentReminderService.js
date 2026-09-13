"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPaymentReminders = runPaymentReminders;
exports.countPendingPayments = countPendingPayments;
exports.countOverdueStudents = countOverdueStudents;
exports.notifyAdminsNewPayment = notifyAdminsNewPayment;
exports.notifyStudentPaymentReviewed = notifyStudentPaymentReviewed;
const StudentBilling_1 = require("../models/StudentBilling");
const PaymentRecord_1 = require("../models/PaymentRecord");
const notificationService_1 = require("./notificationService");
const paymentService_1 = require("./paymentService");
const smsService_1 = require("./smsService");
function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}
function sameDay(a, b) {
    return startOfDay(a).getTime() === startOfDay(b).getTime();
}
function populatedStudent(value) {
    if (!value || typeof value !== "object" || !("name" in value))
        return null;
    return value;
}
async function runPaymentReminders() {
    const billings = await StudentBilling_1.StudentBilling.find({ isActive: true }).populate("student", "name email isActive role whatsapp");
    const today = startOfDay(new Date());
    for (const billing of billings) {
        const studentDoc = populatedStudent(billing.student);
        if (!studentDoc || !studentDoc.isActive || studentDoc.role !== "student") {
            continue;
        }
        const status = (0, paymentService_1.billingStatusLabel)(billing.paidUntil);
        if (status === "current" || status === "not_set")
            continue;
        let kind;
        if (status === "overdue") {
            kind = "overdue";
        }
        else {
            kind = "due_soon";
        }
        if (billing.lastReminderKind === kind &&
            billing.lastReminderAt &&
            sameDay(billing.lastReminderAt, today)) {
            continue;
        }
        const pending = await PaymentRecord_1.PaymentRecord.exists({
            student: studentDoc._id,
            status: "pending",
        });
        if (pending)
            continue;
        const paidUntilText = billing.paidUntil
            ? billing.paidUntil.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
            })
            : "not set";
        const title = kind === "overdue"
            ? "Payment overdue"
            : "Payment due soon";
        const message = kind === "overdue"
            ? `Your academy payment is overdue (paid until ${paidUntilText}). Please submit payment proof in the portal.`
            : `Your academy payment is due soon (paid until ${paidUntilText}). Submit payment proof when ready.`;
        await (0, notificationService_1.createUserNotification)({
            userId: studentDoc._id,
            title,
            message,
            type: "payment",
        });
        if (kind === "overdue" && (0, smsService_1.isSmsConfigured)() && studentDoc.whatsapp) {
            const smsMessage = "Payment reminder: Your payment is overdue. Please log in to your BDOQ student portal or contact us to complete your payment. - BD Online Quran Academy";
            (0, smsService_1.sendSMS)(studentDoc.whatsapp, smsMessage)
                .then((res) => {
                if (!res.success)
                    console.warn(`[SMS Warning] Overdue SMS to ${studentDoc.whatsapp} failed: ${res.message}`);
            })
                .catch((err) => {
                console.warn(`[SMS Error] Exception sending overdue SMS to ${studentDoc.whatsapp}:`, err instanceof Error ? err.message : err);
            });
        }
        billing.lastReminderAt = new Date();
        billing.lastReminderKind = kind;
        await billing.save();
    }
}
async function countPendingPayments() {
    return PaymentRecord_1.PaymentRecord.countDocuments({ status: "pending" });
}
async function countOverdueStudents() {
    const billings = await StudentBilling_1.StudentBilling.find({
        isActive: true,
        paidUntil: { $lt: new Date() },
    });
    return billings.length;
}
async function notifyAdminsNewPayment(studentName) {
    await (0, notificationService_1.notifyAdmins)("New payment proof", `${studentName} submitted a payment for review.`, "payment");
}
async function notifyStudentPaymentReviewed(studentId, approved, reason) {
    await (0, notificationService_1.createUserNotification)({
        userId: studentId,
        title: approved ? "Payment approved" : "Payment needs attention",
        message: approved
            ? "Your payment was approved. Thank you — your account is updated."
            : reason || "Your payment submission was rejected. Please review and submit again.",
        type: "payment",
    });
}

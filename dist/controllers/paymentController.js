"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentBilling = exports.upsertStudentBilling = exports.rejectPayment = exports.approvePayment = exports.listOverdueBillings = exports.listAdminPayments = exports.submitStudentPayment = exports.listStudentPayments = exports.getStudentPaymentStatus = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../models/User");
const StudentBilling_1 = require("../models/StudentBilling");
const PaymentRecord_1 = require("../models/PaymentRecord");
const cloudinaryUploadService_1 = require("../services/cloudinaryUploadService");
const paymentService_1 = require("../services/paymentService");
const paymentReminderService_1 = require("../services/paymentReminderService");
function formatBilling(billing) {
    if (!billing)
        return null;
    return {
        monthlyFee: billing.monthlyFee,
        currency: billing.currency,
        dueDayOfMonth: billing.dueDayOfMonth,
        paidUntil: billing.paidUntil?.toISOString() ?? null,
        status: (0, paymentService_1.billingStatusLabel)(billing.paidUntil),
        isActive: billing.isActive,
    };
}
function populatedStudent(value) {
    if (!value || typeof value !== "object" || !("name" in value))
        return null;
    return value;
}
function formatPayment(record) {
    return {
        id: record._id.toString(),
        studentId: record.student.toString(),
        amount: record.amount,
        currency: record.currency,
        country: record.country,
        paymentDate: record.paymentDate.toISOString(),
        monthsCovered: record.monthsCovered,
        method: record.method,
        reference: record.reference,
        transactionFee: record.transactionFee ?? undefined,
        netAmount: record.netAmount ?? undefined,
        note: record.note ?? undefined,
        screenshotUrl: record.screenshotUrl,
        status: record.status,
        rejectionReason: record.rejectionReason ?? undefined,
        paidUntilAfter: record.paidUntilAfter?.toISOString() ?? undefined,
        reviewedAt: record.reviewedAt?.toISOString() ?? undefined,
        createdAt: record.createdAt.toISOString(),
    };
}
const getStudentPaymentStatus = async (req, res) => {
    try {
        const user = req.user;
        const billing = await StudentBilling_1.StudentBilling.findOne({ student: user._id });
        const pendingCount = await PaymentRecord_1.PaymentRecord.countDocuments({
            student: user._id,
            status: "pending",
        });
        res.status(200).json({
            success: true,
            message: "Payment status fetched",
            data: {
                billing: formatBilling(billing),
                pendingSubmissions: pendingCount,
            },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch payment status",
            data: null,
        });
    }
};
exports.getStudentPaymentStatus = getStudentPaymentStatus;
const listStudentPayments = async (req, res) => {
    try {
        const user = req.user;
        const records = await PaymentRecord_1.PaymentRecord.find({ student: user._id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.status(200).json({
            success: true,
            message: "Payment history fetched",
            data: records.map(formatPayment),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch payment history",
            data: null,
        });
    }
};
exports.listStudentPayments = listStudentPayments;
const submitStudentPayment = async (req, res) => {
    try {
        const user = req.user;
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: "Payment screenshot is required",
                data: null,
            });
            return;
        }
        const billing = await StudentBilling_1.StudentBilling.findOne({
            student: user._id,
            isActive: true,
        });
        if (!billing) {
            res.status(400).json({
                success: false,
                message: "No billing plan is set for your account. Contact your academy admin.",
                data: null,
            });
            return;
        }
        const amount = (0, paymentService_1.parseNumber)(req.body.amount);
        const monthsCovered = (0, paymentService_1.parseNumber)(req.body.monthsCovered);
        const transactionFee = (0, paymentService_1.parseNumber)(req.body.transactionFee);
        const paymentDate = (0, paymentService_1.parsePaymentDate)(req.body.paymentDate);
        const currency = String(req.body.currency || billing.currency).toUpperCase();
        const country = typeof req.body.country === "string" ? req.body.country.trim() : "";
        const method = String(req.body.method || "").toLowerCase();
        const reference = typeof req.body.reference === "string" ? req.body.reference.trim() : "";
        const note = typeof req.body.note === "string" ? req.body.note.trim() : undefined;
        if (amount === null || amount <= 0) {
            res.status(400).json({
                success: false,
                message: "Valid amount is required",
                data: null,
            });
            return;
        }
        if (!monthsCovered || monthsCovered < 1 || monthsCovered > 24) {
            res.status(400).json({
                success: false,
                message: "monthsCovered must be between 1 and 24",
                data: null,
            });
            return;
        }
        if (!paymentDate) {
            res.status(400).json({
                success: false,
                message: "Valid payment date is required",
                data: null,
            });
            return;
        }
        if (!country) {
            res.status(400).json({
                success: false,
                message: "Country is required",
                data: null,
            });
            return;
        }
        if (!reference) {
            res.status(400).json({
                success: false,
                message: "Transaction reference is required",
                data: null,
            });
            return;
        }
        if (!paymentService_1.PAYMENT_METHODS.includes(method)) {
            res.status(400).json({
                success: false,
                message: "Invalid payment method",
                data: null,
            });
            return;
        }
        if (!paymentService_1.BILLING_CURRENCIES.includes(currency)) {
            res.status(400).json({
                success: false,
                message: "Invalid currency",
                data: null,
            });
            return;
        }
        const netAmount = transactionFee !== null && transactionFee >= 0
            ? Math.max(0, amount - transactionFee)
            : undefined;
        let upload;
        try {
            upload = await (0, cloudinaryUploadService_1.uploadPaymentProof)(req.file.buffer, user._id.toString(), req.file.mimetype);
        }
        catch (err) {
            const message = err.message;
            if (message === "CLOUDINARY_NOT_CONFIGURED") {
                res.status(503).json({
                    success: false,
                    message: "Image upload is not configured. Contact support.",
                    data: null,
                });
                return;
            }
            throw err;
        }
        const record = await PaymentRecord_1.PaymentRecord.create({
            student: user._id,
            amount,
            currency,
            country,
            paymentDate,
            monthsCovered: Math.floor(monthsCovered),
            method,
            reference,
            transactionFee: transactionFee ?? undefined,
            netAmount,
            note,
            screenshotUrl: upload.url,
            screenshotPublicId: upload.publicId,
            status: "pending",
        });
        await (0, paymentReminderService_1.notifyAdminsNewPayment)(user.name);
        res.status(201).json({
            success: true,
            message: "Payment submitted for review",
            data: formatPayment(record),
        });
    }
    catch (err) {
        console.error("[payment] submitStudentPayment failed:", err);
        res.status(500).json({
            success: false,
            message: "Failed to submit payment",
            data: null,
        });
    }
};
exports.submitStudentPayment = submitStudentPayment;
const listAdminPayments = async (req, res) => {
    try {
        const status = req.query.status;
        const filter = {};
        if (status === "pending" || status === "approved" || status === "rejected") {
            filter.status = status;
        }
        const records = await PaymentRecord_1.PaymentRecord.find(filter)
            .sort({ createdAt: -1 })
            .limit(100)
            .populate("student", "name email country");
        res.status(200).json({
            success: true,
            message: "Payments fetched",
            data: records.map((r) => ({
                ...formatPayment(r),
                student: (() => {
                    const s = populatedStudent(r.student);
                    return s
                        ? { id: s._id.toString(), name: s.name, email: s.email, country: s.country }
                        : undefined;
                })(),
            })),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch payments",
            data: null,
        });
    }
};
exports.listAdminPayments = listAdminPayments;
const listOverdueBillings = async (_req, res) => {
    try {
        const billings = await StudentBilling_1.StudentBilling.find({
            isActive: true,
            paidUntil: { $lt: new Date() },
        })
            .populate("student", "name email country")
            .sort({ paidUntil: 1 });
        res.status(200).json({
            success: true,
            message: "Overdue billings fetched",
            data: billings.map((b) => {
                const student = populatedStudent(b.student);
                return {
                    student: student
                        ? {
                            id: student._id.toString(),
                            name: student.name,
                            email: student.email,
                            country: student.country,
                        }
                        : { id: "", name: "Unknown", email: "" },
                    monthlyFee: b.monthlyFee,
                    currency: b.currency,
                    paidUntil: b.paidUntil?.toISOString() ?? null,
                    status: (0, paymentService_1.billingStatusLabel)(b.paidUntil),
                };
            }),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch overdue billings",
            data: null,
        });
    }
};
exports.listOverdueBillings = listOverdueBillings;
const approvePayment = async (req, res) => {
    try {
        const admin = req.user;
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid payment ID",
                data: null,
            });
            return;
        }
        const record = await PaymentRecord_1.PaymentRecord.findById(id);
        if (!record) {
            res.status(404).json({
                success: false,
                message: "Payment not found",
                data: null,
            });
            return;
        }
        if (record.status !== "pending") {
            res.status(400).json({
                success: false,
                message: "Only pending payments can be approved",
                data: null,
            });
            return;
        }
        let billing = await StudentBilling_1.StudentBilling.findOne({ student: record.student });
        if (!billing) {
            billing = await StudentBilling_1.StudentBilling.create({
                student: record.student,
                monthlyFee: record.amount / record.monthsCovered,
                currency: record.currency,
                dueDayOfMonth: 1,
                paidUntil: null,
            });
        }
        const paidUntilAfter = (0, paymentService_1.computePaidUntil)(billing.paidUntil, record.monthsCovered);
        billing.paidUntil = paidUntilAfter;
        billing.lastReminderAt = null;
        billing.lastReminderKind = null;
        await billing.save();
        record.status = "approved";
        record.reviewedBy = admin._id;
        record.reviewedAt = new Date();
        record.paidUntilAfter = paidUntilAfter;
        record.rejectionReason = undefined;
        await record.save();
        await (0, paymentReminderService_1.notifyStudentPaymentReviewed)(record.student.toString(), true);
        res.status(200).json({
            success: true,
            message: "Payment approved",
            data: formatPayment(record),
        });
    }
    catch (err) {
        console.error("[payment] approvePayment failed:", err);
        res.status(500).json({
            success: false,
            message: "Failed to approve payment",
            data: null,
        });
    }
};
exports.approvePayment = approvePayment;
const rejectPayment = async (req, res) => {
    try {
        const admin = req.user;
        const { id } = req.params;
        const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid payment ID",
                data: null,
            });
            return;
        }
        const record = await PaymentRecord_1.PaymentRecord.findById(id);
        if (!record) {
            res.status(404).json({
                success: false,
                message: "Payment not found",
                data: null,
            });
            return;
        }
        if (record.status !== "pending") {
            res.status(400).json({
                success: false,
                message: "Only pending payments can be rejected",
                data: null,
            });
            return;
        }
        record.status = "rejected";
        record.reviewedBy = admin._id;
        record.reviewedAt = new Date();
        record.rejectionReason = reason || "Please check your payment details and submit again.";
        await record.save();
        await (0, paymentReminderService_1.notifyStudentPaymentReviewed)(record.student.toString(), false, record.rejectionReason);
        res.status(200).json({
            success: true,
            message: "Payment rejected",
            data: formatPayment(record),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to reject payment",
            data: null,
        });
    }
};
exports.rejectPayment = rejectPayment;
const upsertStudentBilling = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { monthlyFee, currency, dueDayOfMonth, paidUntil, isActive } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(studentId)) {
            res.status(400).json({
                success: false,
                message: "Invalid student ID",
                data: null,
            });
            return;
        }
        const student = await User_1.User.findOne({
            _id: studentId,
            role: "student",
        });
        if (!student) {
            res.status(404).json({
                success: false,
                message: "Student not found",
                data: null,
            });
            return;
        }
        const fee = (0, paymentService_1.parseNumber)(monthlyFee);
        if (fee === null || fee < 0) {
            res.status(400).json({
                success: false,
                message: "Valid monthlyFee is required",
                data: null,
            });
            return;
        }
        const cur = String(currency || "USD").toUpperCase();
        if (!paymentService_1.BILLING_CURRENCIES.includes(cur)) {
            res.status(400).json({
                success: false,
                message: "Invalid currency",
                data: null,
            });
            return;
        }
        const dueDay = (0, paymentService_1.parseNumber)(dueDayOfMonth) ?? 1;
        const paidUntilDate = paidUntil ? (0, paymentService_1.parsePaymentDate)(paidUntil) : null;
        const billing = await StudentBilling_1.StudentBilling.findOneAndUpdate({ student: studentId }, {
            student: studentId,
            monthlyFee: fee,
            currency: cur,
            dueDayOfMonth: Math.min(28, Math.max(1, Math.floor(dueDay))),
            ...(paidUntilDate ? { paidUntil: paidUntilDate } : {}),
            ...(typeof isActive === "boolean" ? { isActive } : {}),
        }, { upsert: true, new: true, setDefaultsOnInsert: true });
        res.status(200).json({
            success: true,
            message: "Student billing updated",
            data: formatBilling(billing),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to update billing",
            data: null,
        });
    }
};
exports.upsertStudentBilling = upsertStudentBilling;
const getStudentBilling = async (req, res) => {
    try {
        const { studentId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(studentId)) {
            res.status(400).json({
                success: false,
                message: "Invalid student ID",
                data: null,
            });
            return;
        }
        const billing = await StudentBilling_1.StudentBilling.findOne({ student: studentId });
        res.status(200).json({
            success: true,
            message: "Billing fetched",
            data: formatBilling(billing),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch billing",
            data: null,
        });
    }
};
exports.getStudentBilling = getStudentBilling;

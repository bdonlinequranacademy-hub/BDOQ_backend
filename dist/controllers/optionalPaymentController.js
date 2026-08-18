"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectOptionalPaymentHandler = exports.approveOptionalPaymentHandler = exports.listAdminOptionalPaymentsHandler = exports.listMyOptionalPayments = exports.submitPortalOptionalPayment = exports.submitPublicOptionalPayment = void 0;
const cloudinaryUploadService_1 = require("../services/cloudinaryUploadService");
const optionalPaymentService_1 = require("../services/optionalPaymentService");
const publicAcademyFeePaymentService_1 = require("../services/publicAcademyFeePaymentService");
function uploadErrorMessage(err) {
    if (!(err instanceof Error))
        return "Failed to upload screenshot";
    if (err.message === "CLOUDINARY_NOT_CONFIGURED") {
        return "File storage is not configured. Please try again later.";
    }
    if (err.message === "FILE_TOO_LARGE") {
        return "Screenshot must be 5MB or smaller.";
    }
    return err.message || "Failed to upload screenshot";
}
async function submitOptionalPayment(req, res, source) {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({
                success: false,
                message: "Payment screenshot is required.",
                data: null,
            });
            return;
        }
        const user = req.user ?? null;
        const folderKey = user?._id?.toString() ?? "public";
        const upload = await (0, cloudinaryUploadService_1.uploadOptionalPaymentProof)(file.buffer, folderKey, file.mimetype);
        const category = typeof req.body.category === "string" ? req.body.category.trim() : "";
        if (category === "admission_fee" || category === "monthly_tuition") {
            const amount = Number(req.body.amount);
            const paymentDateRaw = typeof req.body.paymentDate === "string" ? req.body.paymentDate.trim() : "";
            const paymentDate = paymentDateRaw
                ? new Date(`${paymentDateRaw}T00:00:00`)
                : new Date(NaN);
            const whatsapp = typeof req.body.whatsapp === "string"
                ? req.body.whatsapp.trim()
                : user?.whatsapp?.trim() ?? "";
            const payerName = typeof req.body.payerName === "string"
                ? req.body.payerName.trim()
                : user?.name?.trim() ?? "";
            const reference = typeof req.body.reference === "string" ? req.body.reference.trim() : "";
            const method = typeof req.body.method === "string" ? req.body.method.trim() : "";
            const currencyRaw = typeof req.body.currency === "string"
                ? req.body.currency.trim().toUpperCase()
                : "BDT";
            if (!payerName || payerName.length < 2) {
                res.status(400).json({
                    success: false,
                    message: "Full name is required.",
                    data: null,
                });
                return;
            }
            if (!whatsapp) {
                res.status(400).json({
                    success: false,
                    message: "WhatsApp is required for admission fee and monthly tuition so we can match the student.",
                    data: null,
                });
                return;
            }
            if (!Number.isFinite(amount) || amount < 1) {
                res.status(400).json({
                    success: false,
                    message: "Enter a valid amount.",
                    data: null,
                });
                return;
            }
            if (!reference || reference.length < 3) {
                res.status(400).json({
                    success: false,
                    message: "Transaction / reference number is required.",
                    data: null,
                });
                return;
            }
            if (Number.isNaN(paymentDate.getTime())) {
                res.status(400).json({
                    success: false,
                    message: "Payment date is required.",
                    data: null,
                });
                return;
            }
            if (method !== "bkash" &&
                method !== "nagad" &&
                method !== "rocket" &&
                method !== "bank") {
                res.status(400).json({
                    success: false,
                    message: "Select a valid payment method.",
                    data: null,
                });
                return;
            }
            const feeResult = await (0, publicAcademyFeePaymentService_1.submitPublicAcademyFeePayment)({
                category,
                amount,
                currency: currencyRaw === "USD" ? "USD" : "BDT",
                method,
                payerName,
                whatsapp,
                note: typeof req.body.note === "string" ? req.body.note.trim() : undefined,
                reference,
                paymentDate,
                screenshotUrl: upload.url,
                screenshotPublicId: upload.publicId,
                linkedUser: user,
            });
            if ("error" in feeResult) {
                res.status(400).json({
                    success: false,
                    message: feeResult.error,
                    data: null,
                });
                return;
            }
            res.status(201).json({
                success: true,
                message: category === "admission_fee"
                    ? "JazakAllahu khairan — admission fee proof was received and is awaiting review."
                    : "JazakAllahu khairan — monthly tuition proof was received and is awaiting review.",
                data: feeResult,
            });
            return;
        }
        const result = await (0, optionalPaymentService_1.createOptionalPayment)({
            category: req.body.category,
            customLabel: req.body.customLabel,
            amount: req.body.amount,
            currency: req.body.currency,
            method: req.body.method,
            payerName: req.body.payerName ?? user?.name,
            email: req.body.email ?? user?.email,
            whatsapp: req.body.whatsapp ?? user?.whatsapp,
            note: req.body.note,
            reference: req.body.reference,
            paymentDate: req.body.paymentDate,
            screenshotUrl: upload.url,
            screenshotPublicId: upload.publicId,
            locale: req.body.locale,
            source,
            linkedUser: user,
        });
        if ("error" in result) {
            res.status(400).json({ success: false, message: result.error, data: null });
            return;
        }
        res.status(201).json({
            success: true,
            message: "JazakAllahu khairan — your payment proof was received and is awaiting review.",
            data: (0, optionalPaymentService_1.formatOptionalPayment)(result.payment),
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: uploadErrorMessage(err),
            data: null,
        });
    }
}
const submitPublicOptionalPayment = async (req, res) => {
    await submitOptionalPayment(req, res, "public");
};
exports.submitPublicOptionalPayment = submitPublicOptionalPayment;
const submitPortalOptionalPayment = async (req, res) => {
    await submitOptionalPayment(req, res, "portal");
};
exports.submitPortalOptionalPayment = submitPortalOptionalPayment;
const listMyOptionalPayments = async (req, res) => {
    try {
        const user = req.user;
        const data = await (0, optionalPaymentService_1.listOptionalPaymentsForUser)(user._id.toString());
        res.status(200).json({
            success: true,
            message: "Optional payments fetched",
            data,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch optional payments",
            data: null,
        });
    }
};
exports.listMyOptionalPayments = listMyOptionalPayments;
const listAdminOptionalPaymentsHandler = async (req, res) => {
    try {
        const data = await (0, optionalPaymentService_1.listAdminOptionalPayments)({
            status: req.query.status,
            category: req.query.category,
        });
        res.status(200).json({
            success: true,
            message: "Optional payments fetched",
            data,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch optional payments",
            data: null,
        });
    }
};
exports.listAdminOptionalPaymentsHandler = listAdminOptionalPaymentsHandler;
const approveOptionalPaymentHandler = async (req, res) => {
    try {
        const user = req.user;
        const result = await (0, optionalPaymentService_1.reviewOptionalPayment)({
            id: req.params.id,
            status: "approved",
            reviewerId: user._id.toString(),
        });
        if ("error" in result) {
            res.status(result.code ?? 400).json({
                success: false,
                message: result.error,
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Payment approved",
            data: (0, optionalPaymentService_1.formatOptionalPayment)(result.payment),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to approve payment",
            data: null,
        });
    }
};
exports.approveOptionalPaymentHandler = approveOptionalPaymentHandler;
const rejectOptionalPaymentHandler = async (req, res) => {
    try {
        const user = req.user;
        const result = await (0, optionalPaymentService_1.reviewOptionalPayment)({
            id: req.params.id,
            status: "rejected",
            reviewerId: user._id.toString(),
            reason: req.body.reason,
        });
        if ("error" in result) {
            res.status(result.code ?? 400).json({
                success: false,
                message: result.error,
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Payment rejected",
            data: (0, optionalPaymentService_1.formatOptionalPayment)(result.payment),
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
exports.rejectOptionalPaymentHandler = rejectOptionalPaymentHandler;

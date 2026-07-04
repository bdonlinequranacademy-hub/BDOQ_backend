import { Request, Response } from "express";
import mongoose from "mongoose";
import { IUser, User } from "../models/User";
import { StudentBilling } from "../models/StudentBilling";
import { PaymentRecord } from "../models/PaymentRecord";
import { uploadPaymentProof } from "../services/cloudinaryUploadService";
import {
  BILLING_CURRENCIES,
  PAYMENT_METHODS,
  billingStatusLabel,
  computePaidUntil,
  parseNumber,
  parsePaymentDate,
} from "../services/paymentService";
import {
  notifyAdminsNewPayment,
  notifyStudentPaymentReviewed,
} from "../services/paymentReminderService";
import {
  buildPaymentInvoice,
  ensureInvoiceNumber,
} from "../services/paymentInvoiceService";

function formatBilling(billing: InstanceType<typeof StudentBilling> | null) {
  if (!billing) return null;
  return {
    monthlyFee: billing.monthlyFee,
    currency: billing.currency,
    dueDayOfMonth: billing.dueDayOfMonth,
    paidUntil: billing.paidUntil?.toISOString() ?? null,
    status: billingStatusLabel(billing.paidUntil),
    isActive: billing.isActive,
  };
}

function populatedStudent(value: unknown): IUser | null {
  if (!value || typeof value !== "object" || !("name" in value)) return null;
  return value as IUser;
}

function formatPayment(record: InstanceType<typeof PaymentRecord>) {
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
    invoiceNumber: record.invoiceNumber ?? undefined,
    createdAt: record.createdAt.toISOString(),
  };
}

export const getStudentPaymentStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user as IUser;
    const billing = await StudentBilling.findOne({ student: user._id });
    const pendingCount = await PaymentRecord.countDocuments({
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
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment status",
      data: null,
    });
  }
};

export const listStudentPayments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user as IUser;
    const records = await PaymentRecord.find({ student: user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      message: "Payment history fetched",
      data: records.map(formatPayment),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment history",
      data: null,
    });
  }
};

export const submitStudentPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user as IUser;

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "Payment screenshot is required",
        data: null,
      });
      return;
    }

    const billing = await StudentBilling.findOne({
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

    const amount = parseNumber(req.body.amount);
    const monthsCovered = parseNumber(req.body.monthsCovered);
    const transactionFee = parseNumber(req.body.transactionFee);
    const paymentDate = parsePaymentDate(req.body.paymentDate);
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

    if (!PAYMENT_METHODS.includes(method as (typeof PAYMENT_METHODS)[number])) {
      res.status(400).json({
        success: false,
        message: "Invalid payment method",
        data: null,
      });
      return;
    }

    if (!BILLING_CURRENCIES.includes(currency as (typeof BILLING_CURRENCIES)[number])) {
      res.status(400).json({
        success: false,
        message: "Invalid currency",
        data: null,
      });
      return;
    }

    const netAmount =
      transactionFee !== null && transactionFee >= 0
        ? Math.max(0, amount - transactionFee)
        : undefined;

    let upload;
    try {
      upload = await uploadPaymentProof(
        req.file.buffer,
        user._id.toString(),
        req.file.mimetype
      );
    } catch (err) {
      const message = (err as Error).message;
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

    const record = await PaymentRecord.create({
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

    await notifyAdminsNewPayment(user.name);

    res.status(201).json({
      success: true,
      message: "Payment submitted for review",
      data: formatPayment(record),
    });
  } catch (err) {
    console.error("[payment] submitStudentPayment failed:", err);
    res.status(500).json({
      success: false,
      message: "Failed to submit payment",
      data: null,
    });
  }
};

export const listAdminPayments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const filter: Record<string, string> = {};
    if (status === "pending" || status === "approved" || status === "rejected") {
      filter.status = status;
    }

    const records = await PaymentRecord.find(filter)
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
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      data: null,
    });
  }
};

export const listOverdueBillings = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const billings = await StudentBilling.find({
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
          status: billingStatusLabel(b.paidUntil),
        };
      }),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch overdue billings",
      data: null,
    });
  }
};

export const approvePayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const admin = req.user as IUser;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid payment ID",
        data: null,
      });
      return;
    }

    const record = await PaymentRecord.findById(id);
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

    let billing = await StudentBilling.findOne({ student: record.student });
    if (!billing) {
      billing = await StudentBilling.create({
        student: record.student,
        monthlyFee: record.amount / record.monthsCovered,
        currency: record.currency,
        dueDayOfMonth: 1,
        paidUntil: null,
      });
    }

    const paidUntilAfter = computePaidUntil(billing.paidUntil, record.monthsCovered);
    billing.paidUntil = paidUntilAfter;
    billing.lastReminderAt = null;
    billing.lastReminderKind = null;
    await billing.save();

    record.status = "approved";
    record.reviewedBy = admin._id;
    record.reviewedAt = new Date();
    record.paidUntilAfter = paidUntilAfter;
    record.rejectionReason = undefined;
    await ensureInvoiceNumber(record);

    await notifyStudentPaymentReviewed(record.student.toString(), true);

    res.status(200).json({
      success: true,
      message: "Payment approved",
      data: formatPayment(record),
    });
  } catch (err) {
    console.error("[payment] approvePayment failed:", err);
    res.status(500).json({
      success: false,
      message: "Failed to approve payment",
      data: null,
    });
  }
};

export const rejectPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const admin = req.user as IUser;
    const { id } = req.params;
    const reason =
      typeof req.body.reason === "string" ? req.body.reason.trim() : "";

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid payment ID",
        data: null,
      });
      return;
    }

    const record = await PaymentRecord.findById(id);
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

    await notifyStudentPaymentReviewed(
      record.student.toString(),
      false,
      record.rejectionReason
    );

    res.status(200).json({
      success: true,
      message: "Payment rejected",
      data: formatPayment(record),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to reject payment",
      data: null,
    });
  }
};

export const upsertStudentBilling = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { studentId } = req.params;
    const { monthlyFee, currency, dueDayOfMonth, paidUntil, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      res.status(400).json({
        success: false,
        message: "Invalid student ID",
        data: null,
      });
      return;
    }

    const student = await User.findOne({
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

    const fee = parseNumber(monthlyFee);
    if (fee === null || fee < 0) {
      res.status(400).json({
        success: false,
        message: "Valid monthlyFee is required",
        data: null,
      });
      return;
    }

    const cur = String(currency || "USD").toUpperCase();
    if (!BILLING_CURRENCIES.includes(cur as (typeof BILLING_CURRENCIES)[number])) {
      res.status(400).json({
        success: false,
        message: "Invalid currency",
        data: null,
      });
      return;
    }

    const dueDay = parseNumber(dueDayOfMonth) ?? 1;
    const paidUntilDate = paidUntil ? parsePaymentDate(paidUntil) : null;

    const billing = await StudentBilling.findOneAndUpdate(
      { student: studentId },
      {
        student: studentId,
        monthlyFee: fee,
        currency: cur,
        dueDayOfMonth: Math.min(28, Math.max(1, Math.floor(dueDay))),
        ...(paidUntilDate ? { paidUntil: paidUntilDate } : {}),
        ...(typeof isActive === "boolean" ? { isActive } : {}),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Student billing updated",
      data: formatBilling(billing),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to update billing",
      data: null,
    });
  }
};

export const getStudentBilling = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      res.status(400).json({
        success: false,
        message: "Invalid student ID",
        data: null,
      });
      return;
    }

    const billing = await StudentBilling.findOne({ student: studentId });
    res.status(200).json({
      success: true,
      message: "Billing fetched",
      data: formatBilling(billing),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch billing",
      data: null,
    });
  }
};

async function fetchPaymentInvoiceForUser(
  paymentId: string,
  user: IUser,
  asAdmin: boolean
): Promise<{ status: number; message: string; data: Awaited<ReturnType<typeof buildPaymentInvoice>> }> {
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    return { status: 400, message: "Invalid payment ID", data: null };
  }

  const record = await PaymentRecord.findById(paymentId);
  if (!record) {
    return { status: 404, message: "Payment not found", data: null };
  }

  if (!asAdmin && record.student.toString() !== user._id.toString()) {
    return { status: 403, message: "Not allowed to view this invoice", data: null };
  }

  if (record.status !== "approved") {
    return {
      status: 400,
      message: "Invoice is available only for approved payments",
      data: null,
    };
  }

  const data = await buildPaymentInvoice(paymentId);
  if (!data) {
    return { status: 404, message: "Invoice could not be generated", data: null };
  }

  return { status: 200, message: "Invoice fetched", data };
}

export const getStudentPaymentInvoice = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user as IUser;
    const result = await fetchPaymentInvoiceForUser(req.params.id, user, false);
    res.status(result.status).json({
      success: result.status === 200,
      message: result.message,
      data: result.data,
    });
  } catch (err) {
    console.error("[payment] getStudentPaymentInvoice failed:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch invoice",
      data: null,
    });
  }
};

export const getAdminPaymentInvoice = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user as IUser;
    const result = await fetchPaymentInvoiceForUser(req.params.id, user, true);
    res.status(result.status).json({
      success: result.status === 200,
      message: result.message,
      data: result.data,
    });
  } catch (err) {
    console.error("[payment] getAdminPaymentInvoice failed:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch invoice",
      data: null,
    });
  }
};

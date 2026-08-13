import { Request, Response } from "express";
import type { IUser } from "../models/User";
import { uploadOptionalPaymentProof } from "../services/cloudinaryUploadService";
import {
  createOptionalPayment,
  formatOptionalPayment,
  listAdminOptionalPayments,
  listOptionalPaymentsForUser,
  reviewOptionalPayment,
} from "../services/optionalPaymentService";
import { submitPublicAcademyFeePayment } from "../services/publicAcademyFeePaymentService";

function uploadErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Failed to upload screenshot";
  if (err.message === "CLOUDINARY_NOT_CONFIGURED") {
    return "File storage is not configured. Please try again later.";
  }
  if (err.message === "FILE_TOO_LARGE") {
    return "Screenshot must be 5MB or smaller.";
  }
  return err.message || "Failed to upload screenshot";
}

async function submitOptionalPayment(
  req: Request,
  res: Response,
  source: "public" | "portal"
): Promise<void> {
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

    const user = (req.user as IUser | undefined) ?? null;
    const folderKey = user?._id?.toString() ?? "public";

    const upload = await uploadOptionalPaymentProof(
      file.buffer,
      folderKey,
      file.mimetype
    );

    const category =
      typeof req.body.category === "string" ? req.body.category.trim() : "";
    if (category === "admission_fee" || category === "monthly_tuition") {
      const amount = Number(req.body.amount);
      const paymentDateRaw =
        typeof req.body.paymentDate === "string" ? req.body.paymentDate.trim() : "";
      const paymentDate = paymentDateRaw
        ? new Date(`${paymentDateRaw}T00:00:00`)
        : new Date(NaN);
      const whatsapp =
        typeof req.body.whatsapp === "string"
          ? req.body.whatsapp.trim()
          : user?.whatsapp?.trim() ?? "";
      const payerName =
        typeof req.body.payerName === "string"
          ? req.body.payerName.trim()
          : user?.name?.trim() ?? "";
      const reference =
        typeof req.body.reference === "string" ? req.body.reference.trim() : "";
      const method =
        typeof req.body.method === "string" ? req.body.method.trim() : "";
      const currencyRaw =
        typeof req.body.currency === "string"
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
          message:
            "WhatsApp is required for admission fee and monthly tuition so we can match the student.",
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
      if (
        method !== "bkash" &&
        method !== "nagad" &&
        method !== "rocket" &&
        method !== "bank"
      ) {
        res.status(400).json({
          success: false,
          message: "Select a valid payment method.",
          data: null,
        });
        return;
      }

      const feeResult = await submitPublicAcademyFeePayment({
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
        message:
          category === "admission_fee"
            ? "JazakAllahu khairan — admission fee proof was received and is awaiting review."
            : "JazakAllahu khairan — monthly tuition proof was received and is awaiting review.",
        data: feeResult,
      });
      return;
    }

    const result = await createOptionalPayment({
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
      message:
        "JazakAllahu khairan — your payment proof was received and is awaiting review.",
      data: formatOptionalPayment(result.payment),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: uploadErrorMessage(err),
      data: null,
    });
  }
}

export const submitPublicOptionalPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  await submitOptionalPayment(req, res, "public");
};

export const submitPortalOptionalPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  await submitOptionalPayment(req, res, "portal");
};

export const listMyOptionalPayments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user as IUser;
    const data = await listOptionalPaymentsForUser(user._id.toString());
    res.status(200).json({
      success: true,
      message: "Optional payments fetched",
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch optional payments",
      data: null,
    });
  }
};

export const listAdminOptionalPaymentsHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = await listAdminOptionalPayments({
      status: req.query.status,
      category: req.query.category,
    });
    res.status(200).json({
      success: true,
      message: "Optional payments fetched",
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch optional payments",
      data: null,
    });
  }
};

export const approveOptionalPaymentHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user as IUser;
    const result = await reviewOptionalPayment({
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
      data: formatOptionalPayment(result.payment),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to approve payment",
      data: null,
    });
  }
};

export const rejectOptionalPaymentHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user as IUser;
    const result = await reviewOptionalPayment({
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
      data: formatOptionalPayment(result.payment),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to reject payment",
      data: null,
    });
  }
};

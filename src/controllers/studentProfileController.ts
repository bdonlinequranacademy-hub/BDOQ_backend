import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { Class } from "../models/Class";
import { Attendance } from "../models/Attendance";
import { Progress } from "../models/Progress";
import { PaymentRecord } from "../models/PaymentRecord";
import { StudentBilling } from "../models/StudentBilling";
import { StudentAdmissionApplication } from "../models/StudentAdmissionApplication";
import { normalizeWhatsAppForStorage } from "../lib/whatsappPhone";
import { avatarFieldsFromUser } from "../lib/avatarFields";
import { buildEnrollmentSummaryFromAdmission } from "../services/userProfileSyncService";
import type { IParentInfo } from "../models/User";

export interface StudentProfileView {
  _id: string;
  name: string;
  email: string;
  role: string;
  studentId?: string;
  timezone: string;
  country: string;
  whatsapp: string;
  avatarUrl: string;
  gender?: "male" | "female";
  parentInfo?: IParentInfo;
  applicationData?: Record<string, unknown> | null;
  applicationId?: string | null;
}

function toProfileView(user: InstanceType<typeof User>): StudentProfileView {
  return {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    studentId: user.studentId ?? undefined,
    timezone: user.timezone || "Asia/Dhaka",
    country: user.country || "",
    whatsapp: user.whatsapp || "",
    ...avatarFieldsFromUser(user),
    gender: user.gender,
    parentInfo: user.parentInfo ?? undefined,
  };
}

export const getStudentProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id).select(
      "name email role studentId timezone country whatsapp avatarUrl gender parentInfo sourceAdmissionId"
    );
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
      return;
    }

    let applicationData = null;
    let applicationId = null;

    if (user.sourceAdmissionId) {
      const admission = await StudentAdmissionApplication.findById(user.sourceAdmissionId).select("formData").lean();
      if (admission) {
        applicationData = admission.formData;
        applicationId = String(admission._id);
      }
    }

    res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data: {
        ...toProfileView(user),
        applicationData,
        applicationId,
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      data: null,
    });
  }
};

export const updateStudentProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, timezone, country, whatsapp } = req.body;

    const update: Record<string, string> = {};
    if (typeof name === "string" && name.trim()) update.name = name.trim();
    if (typeof timezone === "string" && timezone.trim()) {
      update.timezone = timezone.trim();
    }
    if (typeof country === "string") update.country = country.trim();
    if (whatsapp !== undefined) {
      const countryHint =
        typeof country === "string" ? country.trim() : req.user?.country;
      const normalized = normalizeWhatsAppForStorage(whatsapp, countryHint);
      if (!normalized.ok) {
        res.status(400).json({
          success: false,
          message: normalized.error,
          data: null,
        });
        return;
      }
      update.whatsapp = normalized.whatsapp;
    }

    const user = await User.findByIdAndUpdate(req.user!._id, update, {
      new: true,
      runValidators: true,
    }).select("name email role studentId timezone country whatsapp parentInfo gender avatarUrl");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: toProfileView(user),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      data: null,
    });
  }
};

export const updateMyApplicationData = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { applicationId, applicationData } = req.body;

    if (!applicationId || !applicationData) {
      res.status(400).json({
        success: false,
        message: "Missing application ID or data",
        data: null,
      });
      return;
    }

    const application = await StudentAdmissionApplication.findById(applicationId);
    if (!application) {
      res.status(404).json({
        success: false,
        message: "Application not found",
        data: null,
      });
      return;
    }

    // Verify ownership
    if (String(application.linkedUserId) !== String(req.user!._id)) {
      res.status(403).json({
        success: false,
        message: "Not authorized to update this application",
        data: null,
      });
      return;
    }

    // Replace old data with new data entirely to support deletion of fields
    application.formData = applicationData;
    application.markModified("formData");
    await application.save();

    res.status(200).json({
      success: true,
      message: "Application data updated successfully",
      data: application.formData,
    });
  } catch (err) {
    console.error("[student] updateMyApplicationData failed:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update application data",
      data: null,
    });
  }
};

export const changeStudentPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || String(newPassword).length < 6) {
      res.status(400).json({
        success: false,
        message: "Current password and new password (min 6 chars) are required",
        data: null,
      });
      return;
    }

    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "Current password is incorrect",
        data: null,
      });
      return;
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
      data: null,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to change password",
      data: null,
    });
  }
};

export const getStudentProfileHub = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const user = await User.findById(userId).select(
      "name email role studentId timezone country whatsapp avatarUrl gender parentInfo sourceAdmissionId"
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
      return;
    }

    const [classes, attendanceDocs, progressCount, payments, billing, admission] =
      await Promise.all([
        Class.find({ students: userId })
          .select("title schedule meetingLink meetingPlatform isActive teacher")
          .populate("teacher", "name email whatsapp")
          .sort({ createdAt: -1 })
          .lean(),
        Attendance.find({ student: userId }).select("status").lean(),
        Progress.countDocuments({ student: userId }),
        PaymentRecord.find({ student: userId })
          .select("amount currency status createdAt")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        StudentBilling.findOne({ student: userId }).lean(),
        user.sourceAdmissionId
          ? StudentAdmissionApplication.findById(user.sourceAdmissionId).lean()
          : StudentAdmissionApplication.findOne({ linkedUserId: userId })
              .sort({ createdAt: -1 })
              .lean(),
      ]);

    const present = attendanceDocs.filter((a) => a.status === "present").length;
    const late = attendanceDocs.filter((a) => a.status === "late").length;
    const total = attendanceDocs.length;
    const attendanceRate =
      total > 0 ? Math.round(((present + late) / total) * 100) : null;

    res.status(200).json({
      success: true,
      message: "Profile hub fetched successfully",
      data: {
        profile: {
          ...toProfileView(user),
          applicationData: admission ? admission.formData : null,
          applicationId: admission ? String(admission._id) : null,
        },
        enrollment: admission
          ? buildEnrollmentSummaryFromAdmission(
              admission as InstanceType<typeof StudentAdmissionApplication>
            )
          : null,
        classes: classes.map((cls) => {
          const teacher = cls.teacher as
            | { name?: string; email?: string; whatsapp?: string }
            | null;
          return {
            _id: String(cls._id),
            title: cls.title,
            schedule: cls.schedule ?? null,
            meetingLink: cls.meetingLink ?? "",
            meetingPlatform: cls.meetingPlatform ?? undefined,
            isActive: cls.isActive !== false,
            teacherName: teacher?.name ?? "Teacher",
            teacherEmail: teacher?.email ?? "",
            teacherWhatsapp: teacher?.whatsapp ?? "",
          };
        }),
        stats: {
          activeClasses: classes.filter((c) => c.isActive !== false).length,
          attendanceRate,
          progressRecords: progressCount,
          recentPayments: payments.length,
        },
        billing: billing
          ? {
              monthlyFee: billing.monthlyFee,
              currency: billing.currency,
              dueDay: billing.dueDayOfMonth,
              paidUntil: billing.paidUntil,
              isActive: billing.isActive !== false,
            }
          : null,
        recentPayments: payments.map((p) => ({
          _id: String(p._id),
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          createdAt: p.createdAt,
        })),
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile hub",
      data: null,
    });
  }
};

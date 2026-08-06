import mongoose from "mongoose";
import { User, type IUser } from "../models/User";
import {
  StudentAdmissionApplication,
  type IStudentAdmissionApplication,
} from "../models/StudentAdmissionApplication";
import { extractParentInfoFromFormData } from "../lib/parentInfoFromFormData";

export async function linkAdmissionToUser(
  admission: IStudentAdmissionApplication,
  userId: mongoose.Types.ObjectId | string
): Promise<void> {
  admission.linkedUserId = new mongoose.Types.ObjectId(String(userId));
  await admission.save();
}

export async function syncUserFromAdmission(
  user: IUser,
  admission: IStudentAdmissionApplication
): Promise<IUser> {
  const parentInfo = extractParentInfoFromFormData(admission.formData);
  if (parentInfo) {
    user.parentInfo = parentInfo;
  }

  if (!user.country && typeof admission.formData.currentCountry === "string") {
    user.country = admission.formData.currentCountry.trim();
  }

  if (!user.gender && (admission.formData.gender === "male" || admission.formData.gender === "female")) {
    user.gender = admission.formData.gender;
  }

  user.sourceAdmissionId = admission._id;
  await user.save();

  if (!admission.linkedUserId) {
    await linkAdmissionToUser(admission, user._id);
  }

  return user;
}

export async function syncUserFromAdmissionByEmail(
  email: string
): Promise<IUser | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const user = await User.findOne({ email: normalized, role: "student" });
  if (!user) return null;

  const admission = await StudentAdmissionApplication.findOne({
    email: normalized,
  }).sort({ createdAt: -1 });

  if (!admission) return user;

  return syncUserFromAdmission(user, admission);
}

export function buildEnrollmentSummaryFromAdmission(
  admission: IStudentAdmissionApplication
) {
  return {
    admissionId: admission._id.toString(),
    packagePlan:
      typeof admission.formData.packagePlan === "string"
        ? admission.formData.packagePlan
        : undefined,
    classStartDate: admission.classStartDate,
    classDays: admission.classDays ?? [],
    classesPerWeek: admission.classesPerWeek,
    classDurationMinutes: admission.classDurationMinutes,
    classTime: admission.classTime,
    assignedTeacherName: admission.assignedTeacherName,
    assignedTeacherSlug: admission.assignedTeacherSlug,
    meetingPlatform: admission.meetingPlatform,
    meetingLink: admission.meetingLink,
    monthlyFeeAmount: admission.monthlyFeeAmount,
    monthlyFeeCurrency: admission.monthlyFeeCurrency,
    paymentStatus: admission.paymentStatus,
    convertedFromTrial: admission.convertedFromTrial ?? false,
  };
}

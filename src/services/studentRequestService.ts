import type { Types } from "mongoose";
import {
  StudentRequest,
  StudentRequestStatus,
} from "../models/StudentRequest";
import { User } from "../models/User";
import {
  createUserNotification,
  notifyAdmins as notifyAdminsRealtime,
} from "./notificationService";

export interface StudentRequestView {
  _id: string;
  message: string;
  preferredCourseType?: string;
  status: StudentRequestStatus;
  adminNote?: string;
  resolvedAt?: string;
  createdAt: string;
  teacher: {
    _id: string;
    name: string;
    email?: string;
  };
}

function formatRequest(doc: InstanceType<typeof StudentRequest>): StudentRequestView {
  const teacher = doc.teacher as { _id: Types.ObjectId; name?: string; email?: string };
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

async function notifyAdmins(title: string, message: string) {
  await notifyAdminsRealtime(title, message, "general");
}

export async function createStudentRequest(
  teacherId: Types.ObjectId,
  message: string,
  preferredCourseType?: string
): Promise<StudentRequestView> {
  const teacher = await User.findById(teacherId).select("name");
  const doc = await StudentRequest.create({
    teacher: teacherId,
    message: message.trim(),
    preferredCourseType: preferredCourseType?.trim() || undefined,
    status: "pending",
  });

  await notifyAdmins(
    "New student assignment request",
    `${teacher?.name ?? "A teacher"} requested a new student assignment.`
  );

  const populated = await StudentRequest.findById(doc._id).populate(
    "teacher",
    "name email"
  );
  return formatRequest(populated!);
}

export async function listTeacherStudentRequests(
  teacherId: Types.ObjectId
): Promise<StudentRequestView[]> {
  const docs = await StudentRequest.find({ teacher: teacherId })
    .populate("teacher", "name email")
    .sort({ createdAt: -1 });
  return docs.map(formatRequest);
}

export async function listAdminStudentRequests(
  status?: StudentRequestStatus
): Promise<StudentRequestView[]> {
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const docs = await StudentRequest.find(filter)
    .populate("teacher", "name email")
    .sort({ createdAt: -1 });
  return docs.map(formatRequest);
}

export async function resolveStudentRequest(
  requestId: string,
  adminId: Types.ObjectId,
  status: "approved" | "rejected",
  adminNote?: string
): Promise<StudentRequestView | null> {
  const doc = await StudentRequest.findByIdAndUpdate(
    requestId,
    {
      status,
      adminNote: adminNote?.trim() || undefined,
      resolvedBy: adminId,
      resolvedAt: new Date(),
    },
    { new: true }
  ).populate("teacher", "name email");

  if (!doc) return null;

  await createUserNotification({
    userId: doc.teacher,
    title:
      status === "approved"
        ? "Student request approved"
        : "Student request declined",
    message:
      status === "approved"
        ? "Admin approved your request for a new student. They may assign students soon."
        : adminNote?.trim() || "Your student assignment request was declined.",
    type: "general",
  });

  return formatRequest(doc);
}

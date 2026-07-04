import { StudentBilling } from "../models/StudentBilling";
import { PaymentRecord } from "../models/PaymentRecord";
import { TrialBooking } from "../models/TrialBooking";
import { StudentAdmissionApplication } from "../models/StudentAdmissionApplication";
import { IUser, User } from "../models/User";
import { billingStatusLabel } from "./paymentService";
import { listRecentClassRemindersForQueue } from "./classReminderService";
import { buildWaMeUrl, parseWhatsApp } from "../lib/whatsappPhone";
import {
  admissionFollowUpMessage,
  classReminderWhatsAppMessage,
  paymentDueSoonMessage,
  paymentOverdueMessage,
  trialLeadFollowUpMessage,
} from "../lib/whatsappMessages";
import { portalBaseUrl } from "./verificationTokens";
import type { ScheduleDay } from "../models/Class";
import {
  ACADEMY_TIMEZONE,
  formatWeeklyTime,
} from "../utils/scheduleUtils";

export type WhatsAppQueueCategory =
  | "payment_overdue"
  | "payment_due_soon"
  | "class_reminder"
  | "new_trial"
  | "new_admission"
  | "missing_whatsapp";

export interface WhatsAppQueueItem {
  id: string;
  category: WhatsAppQueueCategory;
  title: string;
  subtitle: string;
  recipientName: string;
  recipientRole: "student" | "teacher" | "parent" | "lead";
  phoneRaw: string;
  phoneDisplay: string;
  phoneValid: boolean;
  phoneError?: string;
  waUrl: string | null;
  message: string;
  userId?: string;
  createdAt?: string;
}

function populatedStudent(value: unknown): IUser | null {
  if (!value || typeof value !== "object" || !("name" in value)) return null;
  return value as IUser;
}

function queuePhoneFields(
  raw: string,
  countryHint: string | undefined,
  message: string
): Pick<
  WhatsAppQueueItem,
  "phoneRaw" | "phoneDisplay" | "phoneValid" | "phoneError" | "waUrl"
> {
  const parsed = parseWhatsApp(raw, countryHint);
  if (!parsed.ok) {
    return {
      phoneRaw: raw,
      phoneDisplay: raw,
      phoneValid: false,
      phoneError: parsed.error,
      waUrl: null,
    };
  }
  return {
    phoneRaw: parsed.value.e164,
    phoneDisplay: parsed.value.display,
    phoneValid: true,
    waUrl: buildWaMeUrl(parsed.value.waMeDigits, message),
  };
}

export async function listWhatsAppQueue(): Promise<WhatsAppQueueItem[]> {
  const items: WhatsAppQueueItem[] = [];

  const billings = await StudentBilling.find({ isActive: true }).populate(
    "student",
    "name email isActive role whatsapp country"
  );

  for (const billing of billings) {
    const studentDoc = populatedStudent(billing.student);
    if (!studentDoc || !studentDoc.isActive || studentDoc.role !== "student") {
      continue;
    }

    const status = billingStatusLabel(billing.paidUntil);
    if (status !== "due_soon" && status !== "overdue") continue;

    const pending = await PaymentRecord.exists({
      student: studentDoc._id,
      status: "pending",
    });
    if (pending) continue;

    const paidUntilText = billing.paidUntil
      ? billing.paidUntil.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "not set";

    const category: WhatsAppQueueCategory =
      status === "overdue" ? "payment_overdue" : "payment_due_soon";

    const message =
      status === "overdue"
        ? paymentOverdueMessage(studentDoc.name, paidUntilText)
        : paymentDueSoonMessage(studentDoc.name, paidUntilText);

    const raw = studentDoc.whatsapp?.trim() ?? "";
    const phone = raw
      ? queuePhoneFields(raw, studentDoc.country, message)
      : {
          phoneRaw: "",
          phoneDisplay: "Not set",
          phoneValid: false,
          phoneError: "Add WhatsApp on student profile or Users page.",
          waUrl: null as string | null,
        };

    items.push({
      id: `billing-${studentDoc._id.toString()}`,
      category,
      title:
        category === "payment_overdue" ? "Payment overdue" : "Payment due soon",
      subtitle: `Paid until ${paidUntilText}`,
      recipientName: studentDoc.name,
      recipientRole: "student",
      message,
      userId: studentDoc._id.toString(),
      ...phone,
    });
  }

  const trials = await TrialBooking.find({ status: "new" })
    .sort({ createdAt: -1 })
    .limit(30);

  for (const trial of trials) {
    const message = trialLeadFollowUpMessage(trial.parentName);
    items.push({
      id: `trial-${trial._id.toString()}`,
      category: "new_trial",
      title: "New free class lead",
      subtitle: trial.learnerType,
      recipientName: trial.parentName,
      recipientRole: "lead",
      message,
      createdAt: trial.createdAt.toISOString(),
      ...queuePhoneFields(trial.whatsapp, trial.country, message),
    });
  }

  const admissions = await StudentAdmissionApplication.find({ status: "new" })
    .sort({ createdAt: -1 })
    .limit(30);

  for (const app of admissions) {
    const message = admissionFollowUpMessage(app.fullName);
    const country =
      typeof app.formData?.country === "string"
        ? app.formData.country
        : undefined;
    items.push({
      id: `admission-${app._id.toString()}`,
      category: "new_admission",
      title: "New student admission",
      subtitle: app.email,
      recipientName: app.fullName,
      recipientRole: "lead",
      message,
      createdAt: app.createdAt.toISOString(),
      ...queuePhoneFields(app.whatsapp, country, message),
    });
  }

  const studentsMissing = await User.find({
    role: "student",
    isActive: true,
    $or: [{ whatsapp: { $exists: false } }, { whatsapp: "" }],
  })
    .select("name email country createdAt")
    .limit(50);

  for (const student of studentsMissing) {
    items.push({
      id: `missing-${student._id.toString()}`,
      category: "missing_whatsapp",
      title: "Missing WhatsApp number",
      subtitle: student.email,
      recipientName: student.name,
      recipientRole: "student",
      phoneRaw: "",
      phoneDisplay: "Not set",
      phoneValid: false,
      phoneError: "Edit user in Admin → Users and add country code + number.",
      waUrl: null,
      message: "",
      userId: student._id.toString(),
      createdAt: student.createdAt.toISOString(),
    });
  }

  const teachersMissing = await User.find({
    role: "teacher",
    isActive: true,
    $or: [{ whatsapp: { $exists: false } }, { whatsapp: "" }],
  })
    .select("name email country createdAt")
    .limit(30);

  for (const teacher of teachersMissing) {
    items.push({
      id: `missing-${teacher._id.toString()}`,
      category: "missing_whatsapp",
      title: "Missing WhatsApp number",
      subtitle: teacher.email,
      recipientName: teacher.name,
      recipientRole: "teacher",
      phoneRaw: "",
      phoneDisplay: "Not set",
      phoneValid: false,
      phoneError: "Edit user in Admin → Users and add country code + number.",
      waUrl: null,
      message: "",
      userId: teacher._id.toString(),
      createdAt: teacher.createdAt.toISOString(),
    });
  }

  const classReminders = await listRecentClassRemindersForQueue();
  for (const entry of classReminders) {
    const day = entry.slot.day as ScheduleDay;
    const portalBase = portalBaseUrl();

    const pushClassReminder = (
      user: IUser,
      role: "student" | "teacher",
      partnerName: string
    ) => {
      const tz = user.timezone?.trim() || ACADEMY_TIMEZONE;
      const timeLabel = `${day} ${formatWeeklyTime(day, entry.slot.startTime, tz, ACADEMY_TIMEZONE)}`;
      const message = classReminderWhatsAppMessage({
        recipientName: user.name,
        role,
        classTitle: entry.classTitle,
        partnerName,
        timeLabel,
        meetingLink: entry.meetingLink,
        portalUrl: role === "teacher" ? `${portalBase}/teacher` : `${portalBase}/student`,
      });
      const raw = user.whatsapp?.trim() ?? "";
      items.push({
        id: `class-${entry.slot._id.toString()}-${role}-${user._id.toString()}`,
        category: "class_reminder",
        title: entry.reminded ? "Class reminder sent" : "Class starting soon",
        subtitle: `${entry.classTitle} · ${Math.round(entry.minutesUntil)} min`,
        recipientName: user.name,
        recipientRole: role,
        message,
        userId: user._id.toString(),
        ...(raw
          ? queuePhoneFields(raw, user.country, message)
          : {
              phoneRaw: "",
              phoneDisplay: "Not set",
              phoneValid: false,
              phoneError: "Add WhatsApp on user profile.",
              waUrl: null as string | null,
            }),
      });
    };

    pushClassReminder(entry.teacher, "teacher", entry.student.name);
    pushClassReminder(entry.student, "student", entry.teacher.name);
  }

  const priority: Record<WhatsAppQueueCategory, number> = {
    class_reminder: 0,
    payment_overdue: 1,
    payment_due_soon: 2,
    new_trial: 3,
    new_admission: 4,
    missing_whatsapp: 5,
  };

  return items.sort((a, b) => priority[a.category] - priority[b.category]);
}

import { StudentBilling } from "../models/StudentBilling";
import { PaymentRecord } from "../models/PaymentRecord";
import { IUser, User } from "../models/User";
import { createUserNotification, notifyAdmins } from "./notificationService";
import { billingStatusLabel } from "./paymentService";
import { sendSMS, isSmsConfigured } from "./smsService";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function populatedStudent(value: unknown): IUser | null {
  if (!value || typeof value !== "object" || !("name" in value)) return null;
  return value as IUser;
}

export async function runPaymentReminders(): Promise<void> {
  const billings = await StudentBilling.find({ isActive: true }).populate(
    "student",
    "name email isActive role whatsapp"
  );

  const today = startOfDay(new Date());

  for (const billing of billings) {
    const studentDoc = populatedStudent(billing.student);
    if (!studentDoc || !studentDoc.isActive || studentDoc.role !== "student") {
      continue;
    }

    const status = billingStatusLabel(billing.paidUntil);
    if (status === "current" || status === "not_set") continue;

    let kind: "due_soon" | "due_today" | "overdue";
    if (status === "overdue") {
      kind = "overdue";
    } else {
      kind = "due_soon";
    }

    if (
      billing.lastReminderKind === kind &&
      billing.lastReminderAt &&
      sameDay(billing.lastReminderAt, today)
    ) {
      continue;
    }

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

    const title =
      kind === "overdue"
        ? "Payment overdue"
        : "Payment due soon";

    const message =
      kind === "overdue"
        ? `Your academy payment is overdue (paid until ${paidUntilText}). Please submit payment proof in the portal.`
        : `Your academy payment is due soon (paid until ${paidUntilText}). Submit payment proof when ready.`;

    await createUserNotification({
      userId: studentDoc._id,
      title,
      message,
      type: "payment",
    });

    if (kind === "overdue" && isSmsConfigured() && studentDoc.whatsapp) {
      const smsMessage = "Payment reminder: Your payment is overdue. Please log in to your BDOQ student portal or contact us to complete your payment. - BD Online Quran Academy";
      sendSMS(studentDoc.whatsapp, smsMessage)
        .then((res) => {
          if (!res.success) console.warn(`[SMS Warning] Overdue SMS to ${studentDoc.whatsapp} failed: ${res.message}`);
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

export async function countPendingPayments(): Promise<number> {
  return PaymentRecord.countDocuments({ status: "pending" });
}

export async function countOverdueStudents(): Promise<number> {
  const billings = await StudentBilling.find({
    isActive: true,
    paidUntil: { $lt: new Date() },
  });
  return billings.length;
}

export async function notifyAdminsNewPayment(studentName: string): Promise<void> {
  await notifyAdmins(
    "New payment proof",
    `${studentName} submitted a payment for review.`,
    "payment"
  );
}

export async function notifyStudentPaymentReviewed(
  studentId: string,
  approved: boolean,
  reason?: string
): Promise<void> {
  await createUserNotification({
    userId: studentId,
    title: approved ? "Payment approved" : "Payment needs attention",
    message: approved
      ? "Your payment was approved. Thank you — your account is updated."
      : reason || "Your payment submission was rejected. Please review and submit again.",
    type: "payment",
  });
}

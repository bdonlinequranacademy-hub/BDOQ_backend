import { Class } from "../models/Class";
import { PaymentRecord } from "../models/PaymentRecord";
import { IUser, User } from "../models/User";
import { ACADEMY_BRAND } from "../lib/academyBrand";

export interface PaymentInvoiceCourseLine {
  title: string;
  teacherName: string;
  schedule?: string;
}

export interface PaymentInvoicePayload {
  invoiceNumber: string;
  paymentId: string;
  issuedAt: string;
  student: {
    name: string;
    email: string;
    studentId?: string;
    country: string;
  };
  academy: typeof ACADEMY_BRAND;
  description: string;
  monthsCovered: number;
  amount: number;
  currency: string;
  transactionFee?: number;
  netAmount?: number;
  method: string;
  reference: string;
  paymentDate: string;
  paidUntilAfter?: string;
  note?: string;
  courses: PaymentInvoiceCourseLine[];
}

function formatSchedule(day: string, time: string, duration: number): string {
  return `${day}, ${time} (${duration} min)`;
}

export async function generateNextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const count = await PaymentRecord.countDocuments({
    invoiceNumber: { $regex: `^${prefix}` },
  });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

export async function ensureInvoiceNumber(
  record: InstanceType<typeof PaymentRecord>
): Promise<string> {
  if (record.invoiceNumber) {
    return record.invoiceNumber;
  }
  const invoiceNumber = await generateNextInvoiceNumber();
  record.invoiceNumber = invoiceNumber;
  await record.save();
  return invoiceNumber;
}

async function loadStudentCourses(studentId: string): Promise<PaymentInvoiceCourseLine[]> {
  const classes = await Class.find({
    students: studentId,
    isActive: true,
  })
    .populate("teacher", "name")
    .sort({ title: 1 })
    .limit(5);

  return classes.map((cls) => {
    const teacherDoc = cls.teacher as unknown;
    let teacherName = "Assigned teacher";
    if (
      teacherDoc &&
      typeof teacherDoc === "object" &&
      "name" in teacherDoc &&
      typeof (teacherDoc as { name: unknown }).name === "string"
    ) {
      teacherName = (teacherDoc as { name: string }).name;
    }
    const schedule =
      cls.schedule?.day && cls.schedule?.time
        ? formatSchedule(
            cls.schedule.day,
            cls.schedule.time,
            cls.schedule.duration ?? 60
          )
        : undefined;
    return {
      title: cls.title,
      teacherName,
      schedule,
    };
  });
}

export async function buildPaymentInvoice(
  paymentId: string
): Promise<PaymentInvoicePayload | null> {
  const record = await PaymentRecord.findById(paymentId);
  if (!record || record.status !== "approved") {
    return null;
  }

  const student = await User.findById(record.student).select(
    "name email studentId country"
  );
  if (!student) {
    return null;
  }

  const invoiceNumber = await ensureInvoiceNumber(record);
  const courses = await loadStudentCourses(student._id.toString());

  const monthLabel =
    record.monthsCovered === 1
      ? "1 month"
      : `${record.monthsCovered} months`;

  return {
    invoiceNumber,
    paymentId: record._id.toString(),
    issuedAt: (record.reviewedAt ?? record.updatedAt).toISOString(),
    student: {
      name: student.name,
      email: student.email,
      studentId: student.studentId ?? undefined,
      country: record.country || student.country || "",
    },
    academy: ACADEMY_BRAND,
    description: `Quran tuition fee — ${monthLabel}`,
    monthsCovered: record.monthsCovered,
    amount: record.amount,
    currency: record.currency,
    transactionFee: record.transactionFee,
    netAmount: record.netAmount,
    method: record.method,
    reference: record.reference,
    paymentDate: record.paymentDate.toISOString(),
    paidUntilAfter: record.paidUntilAfter?.toISOString(),
    note: record.note,
    courses,
  };
}

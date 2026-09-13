import { Attendance } from "../models/Attendance";
import { SessionAlertLog, type SessionAlertType } from "../models/SessionAlertLog";
import { SessionSlot } from "../models/SessionSlot";
import { IUser } from "../models/User";
import {
  createUserNotification,
  notifyAdmins,
} from "./notificationService";
import { getJoinMapForDate } from "./sessionJoinService";
import { emitAdminLiveMonitorUpdate } from "../realtime/socketServer";
import { sendSMS, isSmsConfigured } from "./smsService";
import {
  ACADEMY_TIMEZONE,
  formatWeeklyTime,
  getSessionInstant,
  getSessionPhase,
  getTodayScheduleDay,
  normalizeScheduleTime,
} from "../utils/scheduleUtils";

const TEACHER_LATE_MINUTES = 5;
const STUDENT_NO_SHOW_MINUTES = 10;

function getAcademyDateString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ACADEMY_TIMEZONE,
  }).format(now);
}

function populatedUser(value: unknown): IUser | null {
  if (!value || typeof value !== "object" || !("name" in value)) return null;
  return value as IUser;
}

function populatedClass(value: unknown): { title: string; isActive?: boolean } | null {
  if (!value || typeof value !== "object" || !("title" in value)) return null;
  return value as { title: string; isActive?: boolean };
}

async function alertAlreadySent(
  sessionSlotId: string,
  sessionDate: string,
  alertType: SessionAlertType
): Promise<boolean> {
  const existing = await SessionAlertLog.findOne({
    sessionSlot: sessionSlotId,
    sessionDate,
    alertType,
  });
  return Boolean(existing);
}

async function markAlertSent(
  sessionSlotId: string,
  sessionDate: string,
  alertType: SessionAlertType
): Promise<void> {
  await SessionAlertLog.create({
    sessionSlot: sessionSlotId,
    sessionDate,
    alertType,
  }).catch(() => {
    /* duplicate race — ignore */
  });
}

async function autoMarkAbsent(input: {
  classId: string;
  studentId: string;
  sessionDate: string;
}): Promise<void> {
  const attendanceDate = new Date(`${input.sessionDate}T00:00:00.000Z`);
  await Attendance.findOneAndUpdate(
    {
      class: input.classId,
      student: input.studentId,
      date: attendanceDate,
    },
    {
      $setOnInsert: {
        class: input.classId,
        student: input.studentId,
        date: attendanceDate,
      },
      $set: { status: "absent" },
    },
    { upsert: true }
  );
}

export async function runNoShowChecks(): Promise<number> {
  const now = new Date();
  const day = getTodayScheduleDay();
  const sessionDate = getAcademyDateString(now);
  const joinMap = await getJoinMapForDate(sessionDate);

  const slots = await SessionSlot.find({ day, isActive: true })
    .populate("class", "title isActive")
    .populate("teacher", "name email isActive whatsapp")
    .populate("student", "name email isActive whatsapp");

  let alertsSent = 0;

  for (const slot of slots) {
    const classDoc = populatedClass(slot.class);
    const teacher = populatedUser(slot.teacher);
    const student = populatedUser(slot.student);
    if (!classDoc || classDoc.isActive === false || !teacher?.isActive || !student?.isActive) {
      continue;
    }

    const startsAt = getSessionInstant(slot.day, slot.startTime);
    if (!startsAt) continue;

    const phase = slot.sessionPhase ?? getSessionPhase(startsAt, slot.durationMinutes, now);
    const minutesSinceStart = (now.getTime() - startsAt.getTime()) / 60_000;
    const joins = joinMap.get(slot._id.toString()) ?? {};
    const startTime = normalizeScheduleTime(slot.startTime) ?? slot.startTime;
    const timeLabel = formatWeeklyTime(slot.day, startTime, ACADEMY_TIMEZONE, ACADEMY_TIMEZONE);
    const slotId = slot._id.toString();

    if (
      phase === "live" &&
      minutesSinceStart >= TEACHER_LATE_MINUTES &&
      !joins.teacherJoinedAt &&
      !(await alertAlreadySent(slotId, sessionDate, "teacher_late"))
    ) {
      await markAlertSent(slotId, sessionDate, "teacher_late");
      const msg = `${teacher.name} has not joined "${classDoc.title}" with ${student.name} (${timeLabel}). Class started ${Math.floor(minutesSinceStart)} min ago.`;
      await notifyAdmins("Teacher late", msg, "class");
      await createUserNotification({
        userId: teacher._id,
        title: "Class started — please join",
        message: `Your class "${classDoc.title}" with ${student.name} started at ${timeLabel}. Please join the meeting now.`,
        type: "class",
      });
      alertsSent += 1;
    }

    if (
      (phase === "live" || phase === "completed") &&
      minutesSinceStart >= STUDENT_NO_SHOW_MINUTES &&
      !joins.studentJoinedAt &&
      !(await alertAlreadySent(slotId, sessionDate, "student_no_show"))
    ) {
      await markAlertSent(slotId, sessionDate, "student_no_show");
      const msg = `${student.name} has not joined "${classDoc.title}" with ${teacher.name} (${timeLabel}).`;
      await notifyAdmins("Student no-show", msg, "class");
      await createUserNotification({
        userId: student._id,
        title: "Class in progress — please join",
        message: `Your class "${classDoc.title}" with ${teacher.name} is in progress. Please join now.`,
        type: "class",
      });
      alertsSent += 1;
    }

    if (
      phase === "completed" &&
      !joins.teacherJoinedAt &&
      !(await alertAlreadySent(slotId, sessionDate, "teacher_no_show"))
    ) {
      await markAlertSent(slotId, sessionDate, "teacher_no_show");
      const msg = `${teacher.name} did not join "${classDoc.title}" with ${student.name} (${timeLabel}).`;
      await notifyAdmins("Teacher no-show", msg, "class");
      
      if (isSmsConfigured() && student.whatsapp) {
        const smsMessage = "Sorry, your teacher hasn't joined the class yet. Our team has been notified and will assist you shortly. - BDOQ Academy";
        sendSMS(student.whatsapp, smsMessage)
          .then((res) => {
            if (!res.success) console.warn(`[SMS Warning] Teacher no-show SMS to ${student.whatsapp} failed: ${res.message}`);
          })
          .catch((err) => {
            console.warn(`[SMS Error] Exception sending teacher no-show SMS to ${student.whatsapp}:`, err instanceof Error ? err.message : err);
          });
      }

      alertsSent += 1;
    }

    if (phase === "completed" && !joins.studentJoinedAt) {
      await autoMarkAbsent({
        classId: slot.class.toString(),
        studentId: slot.student.toString(),
        sessionDate,
      });
    }
  }

  if (alertsSent > 0) {
    emitAdminLiveMonitorUpdate();
    console.log(`[no-show] sent ${alertsSent} alert(s)`);
  }

  return alertsSent;
}

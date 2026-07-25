import { Class, IClass, type ScheduleDay } from "../models/Class";
import { ClassReminderLog } from "../models/ClassReminderLog";
import { SessionSlot, ISessionSlot } from "../models/SessionSlot";
import { IUser } from "../models/User";
import {
  classReminderEmailSubject,
  classReminderPortalMessage,
  classReminderPortalTitle,
  classReminderWhatsAppMessage,
} from "../lib/whatsappMessages";
import { buildWaMeUrl, parseWhatsApp } from "../lib/whatsappPhone";
import { createUserNotification } from "./notificationService";
import { sendEmail } from "./emailService";
import { portalBaseUrl } from "./verificationTokens";
import {
  ACADEMY_TIMEZONE,
  formatWeeklyTime,
  getSessionInstant,
  getTodayScheduleDay,
} from "../utils/scheduleUtils";

const REMINDER_MINUTES = 10;
const REMINDER_WINDOW_MIN = 9;
const REMINDER_WINDOW_MAX = 10.5;

function getAcademyDateString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ACADEMY_TIMEZONE,
  }).format(now);
}

function populatedUser(value: unknown): IUser | null {
  if (!value || typeof value !== "object" || !("email" in value)) return null;
  return value as IUser;
}

function populatedClass(value: unknown): IClass | null {
  if (!value || typeof value !== "object" || !("title" in value)) return null;
  return value as IClass;
}

function portalHomeForRole(role: IUser["role"]): string {
  const base = portalBaseUrl();
  switch (role) {
    case "teacher":
      return `${base}/teacher`;
    case "admin":
    case "super_admin":
      return `${base}/admin`;
    case "student":
    default:
      return `${base}/student`;
  }
}

function timeLabelForUser(
  day: ScheduleDay,
  startTime: string,
  timezone: string
): string {
  const formatted = formatWeeklyTime(day, startTime, timezone, ACADEMY_TIMEZONE);
  return `${day} ${formatted} (${timezone.replace("_", " ")})`;
}

async function notifyParticipant(input: {
  user: IUser;
  role: "student" | "teacher";
  classTitle: string;
  partnerName: string;
  day: ScheduleDay;
  startTime: string;
  meetingLink?: string;
}): Promise<void> {
  const timezone = input.user.timezone?.trim() || ACADEMY_TIMEZONE;
  const timeLabel = timeLabelForUser(input.day, input.startTime, timezone);
  const portalUrl = portalHomeForRole(input.user.role);
  const waText = classReminderWhatsAppMessage({
    recipientName: input.user.name,
    role: input.role,
    classTitle: input.classTitle,
    partnerName: input.partnerName,
    timeLabel,
    meetingLink: input.meetingLink,
    portalUrl,
  });

  let whatsAppUrl: string | null = null;
  if (input.user.whatsapp?.trim()) {
    const parsed = parseWhatsApp(input.user.whatsapp, input.user.country);
    if (parsed.ok) {
      whatsAppUrl = buildWaMeUrl(parsed.value.waMeDigits, waText);
    }
  }

  const portalMessage = classReminderPortalMessage({
    classTitle: input.classTitle,
    partnerName: input.partnerName,
    timeLabel,
    meetingLink: input.meetingLink,
    whatsAppUrl,
  });

  await createUserNotification({
    userId: input.user._id,
    title: classReminderPortalTitle(),
    message: portalMessage,
    type: "class",
  });

  if (input.user.email?.trim()) {
    const subject = classReminderEmailSubject(input.classTitle);
    const text = waText;
    const htmlParts = [
      `<p>Assalamu Alaikum <strong>${input.user.name}</strong>,</p>`,
      `<p>Your BDOQ Academy class <strong>${input.classTitle}</strong> with <strong>${input.partnerName}</strong> starts in <strong>10 minutes</strong>.</p>`,
      `<p><strong>Time:</strong> ${timeLabel}</p>`,
    ];
    if (input.meetingLink?.trim()) {
      htmlParts.push(
        `<p><a href="${input.meetingLink.trim()}">Join class meeting</a></p>`
      );
    }
    htmlParts.push(`<p><a href="${portalUrl}">Open portal</a></p>`);
    if (whatsAppUrl) {
      htmlParts.push(
        `<p><a href="${whatsAppUrl}">Open WhatsApp reminder</a> (save or forward to family)</p>`
      );
    }
    htmlParts.push("<p>JazakAllah Khair — BD Online Quran Academy</p>");

    await sendEmail({
      to: input.user.email,
      subject,
      text,
      html: htmlParts.join("\n"),
    }).catch((err) => {
      console.warn("[class-reminder] email failed:", err);
    });
  }
}

export async function runClassReminders(): Promise<number> {
  const today = getTodayScheduleDay();
  const sessionDate = getAcademyDateString();
  const now = new Date();

  const slots = await SessionSlot.find({
    day: today,
    isActive: true,
    $or: [
      { sessionPhase: "upcoming" },
      { sessionPhase: { $exists: false } },
    ],
  })
    .populate("class", "title meetingLink isActive teacher")
    .populate("teacher", "name email role isActive timezone country whatsapp meetingLink")
    .populate("student", "name email role isActive timezone country whatsapp");

  let sent = 0;

  for (const slot of slots) {
    const startsAt = getSessionInstant(slot.day, slot.startTime);
    if (!startsAt) continue;

    const minutesUntil = (startsAt.getTime() - now.getTime()) / 60_000;
    if (minutesUntil <= REMINDER_WINDOW_MIN || minutesUntil > REMINDER_WINDOW_MAX) {
      continue;
    }

    const existing = await ClassReminderLog.findOne({
      sessionSlot: slot._id,
      sessionDate,
    });
    if (existing) continue;

    const classDoc = populatedClass(slot.class);
    if (!classDoc || classDoc.isActive === false) continue;

    const teacher = populatedUser(slot.teacher);
    const student = populatedUser(slot.student);
    if (!teacher?.isActive || !student?.isActive) continue;

    const meetingLink =
      classDoc.meetingLink?.trim() ||
      teacher.meetingLink?.trim() ||
      undefined;

    try {
      await notifyParticipant({
        user: teacher,
        role: "teacher",
        classTitle: classDoc.title,
        partnerName: student.name,
        day: slot.day,
        startTime: slot.startTime,
        meetingLink,
      });

      await notifyParticipant({
        user: student,
        role: "student",
        classTitle: classDoc.title,
        partnerName: teacher.name,
        day: slot.day,
        startTime: slot.startTime,
        meetingLink,
      });

      await ClassReminderLog.create({
        sessionSlot: slot._id,
        sessionDate,
      });

      sent += 1;
    } catch (err) {
      console.warn("[class-reminder] failed for slot", slot._id.toString(), err);
    }
  }

  if (sent > 0) {
    console.log(`[class-reminder] sent ${sent} session reminder(s) (${REMINDER_MINUTES} min before)`);
  }

  return sent;
}

/** For admin WhatsApp queue — today's classes with reminders sent or due soon. */
export async function listRecentClassRemindersForQueue(): Promise<
  Array<{
    slot: ISessionSlot;
    classTitle: string;
    teacher: IUser;
    student: IUser;
    meetingLink?: string;
    minutesUntil: number;
    reminded: boolean;
  }>
> {
  const today = getTodayScheduleDay();
  const sessionDate = getAcademyDateString();
  const now = new Date();

  const slots = await SessionSlot.find({ day: today, isActive: true })
    .populate("class", "title meetingLink isActive")
    .populate("teacher", "name email whatsapp country isActive")
    .populate("student", "name email whatsapp country isActive");

  const remindedIds = new Set(
    (
      await ClassReminderLog.find({ sessionDate }).select("sessionSlot")
    ).map((log) => log.sessionSlot.toString())
  );

  const results: Array<{
    slot: ISessionSlot;
    classTitle: string;
    teacher: IUser;
    student: IUser;
    meetingLink?: string;
    minutesUntil: number;
    reminded: boolean;
  }> = [];

  for (const slot of slots) {
    const startsAt = getSessionInstant(slot.day, slot.startTime);
    if (!startsAt) continue;

    const minutesUntil = (startsAt.getTime() - now.getTime()) / 60_000;
    const reminded = remindedIds.has(slot._id.toString());
    if (minutesUntil < -5 || (minutesUntil > 15 && !reminded)) continue;

    const classDoc = populatedClass(slot.class);
    const teacher = populatedUser(slot.teacher);
    const student = populatedUser(slot.student);
    if (!classDoc || !teacher || !student) continue;

    results.push({
      slot,
      classTitle: classDoc.title,
      teacher,
      student,
      meetingLink: classDoc.meetingLink?.trim() || teacher.meetingLink?.trim(),
      minutesUntil,
      reminded,
    });
  }

  return results.sort((a, b) => a.minutesUntil - b.minutesUntil);
}

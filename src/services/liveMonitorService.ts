import { Class, IClass } from "../models/Class";
import { SessionSlot, ISessionSlot } from "../models/SessionSlot";
import { IUser, User } from "../models/User";
import { getJoinMapForDate } from "./sessionJoinService";
import {
  ACADEMY_TIMEZONE,
  formatDuration,
  formatWeeklyTime,
  getSessionInstant,
  getSessionPhase,
  getTodayScheduleDay,
  normalizeScheduleTime,
  type SessionPhase,
} from "../utils/scheduleUtils";

function getAcademyDateString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ACADEMY_TIMEZONE,
  }).format(now);
}

function populatedUser(value: unknown): IUser | null {
  if (!value || typeof value !== "object" || !("name" in value)) return null;
  return value as IUser;
}

function populatedClass(value: unknown): IClass | null {
  if (!value || typeof value !== "object" || !("title" in value)) return null;
  return value as IClass;
}

export type LiveMonitorJoinStatus = "joined" | "not_joined" | "late";

export interface LiveMonitorSession {
  _id: string;
  classId: string;
  classTitle: string;
  courseType: string;
  durationMinutes: number;
  durationLabel: string;
  day: string;
  meetingLink?: string;
  sessionPhase: SessionPhase;
  startsAt: string;
  endsAt: string;
  startTimeLabel: string;
  minutesUntilStart: number;
  minutesSinceStart: number;
  student: { _id: string; name: string; studentId?: string };
  teacher: { _id: string; name: string };
  joins: {
    teacherJoinedAt?: string;
    studentJoinedAt?: string;
    teacherStatus: LiveMonitorJoinStatus;
    studentStatus: LiveMonitorJoinStatus;
  };
  alerts: {
    teacherLate: boolean;
    studentNoShow: boolean;
    teacherNoShow: boolean;
  };
}

export interface LiveMonitorSummary {
  sessionDate: string;
  day: string;
  liveCount: number;
  upcomingCount: number;
  completedCount: number;
  teacherLateCount: number;
  studentNoShowCount: number;
  teacherNoShowCount: number;
  totalToday: number;
}

export interface LiveMonitorPayload {
  summary: LiveMonitorSummary;
  sessions: LiveMonitorSession[];
  updatedAt: string;
}

const TEACHER_LATE_MINUTES = 5;
const STUDENT_NO_SHOW_MINUTES = 10;

function resolveJoinStatus(
  joinedAt: string | undefined,
  startsAt: Date,
  now: Date,
  lateThresholdMinutes: number
): LiveMonitorJoinStatus {
  if (!joinedAt) return "not_joined";
  const joined = new Date(joinedAt);
  const lateCutoff = new Date(startsAt.getTime() + lateThresholdMinutes * 60_000);
  if (joined > lateCutoff) return "late";
  return "joined";
}

function buildSessionRow(
  slot: ISessionSlot,
  joinMap: Map<string, { teacherJoinedAt?: string; studentJoinedAt?: string }>,
  now: Date
): LiveMonitorSession | null {
  const startsAt = getSessionInstant(slot.day, slot.startTime);
  if (!startsAt) return null;

  const startTime = normalizeScheduleTime(slot.startTime) ?? slot.startTime;
  const sessionPhase =
    slot.sessionPhase ?? getSessionPhase(startsAt, slot.durationMinutes, now);
  const endsAt = new Date(startsAt.getTime() + slot.durationMinutes * 60_000);
  const minutesUntilStart = (startsAt.getTime() - now.getTime()) / 60_000;
  const minutesSinceStart = (now.getTime() - startsAt.getTime()) / 60_000;

  const classDoc = populatedClass(slot.class);
  const teacher = populatedUser(slot.teacher);
  const student = populatedUser(slot.student);
  if (!classDoc || !teacher || !student) return null;

  const joins = joinMap.get(slot._id.toString()) ?? {};
  const teacherStatus = resolveJoinStatus(
    joins.teacherJoinedAt,
    startsAt,
    now,
    TEACHER_LATE_MINUTES
  );
  const studentStatus = resolveJoinStatus(
    joins.studentJoinedAt,
    startsAt,
    now,
    STUDENT_NO_SHOW_MINUTES
  );

  const isLiveOrPast = sessionPhase === "live" || sessionPhase === "completed";
  const teacherLate =
    isLiveOrPast &&
    minutesSinceStart >= TEACHER_LATE_MINUTES &&
    !joins.teacherJoinedAt;
  const studentNoShow =
    isLiveOrPast &&
    minutesSinceStart >= STUDENT_NO_SHOW_MINUTES &&
    !joins.studentJoinedAt;
  const teacherNoShow =
    sessionPhase === "completed" && !joins.teacherJoinedAt;

  const meetingLink =
    classDoc.meetingLink?.trim() || teacher.meetingLink?.trim() || undefined;

  return {
    _id: slot._id.toString(),
    classId: classDoc._id.toString(),
    classTitle: classDoc.title,
    courseType: slot.courseType || classDoc.title,
    durationMinutes: slot.durationMinutes,
    durationLabel: formatDuration(slot.durationMinutes),
    day: slot.day,
    meetingLink,
    sessionPhase,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    startTimeLabel: formatWeeklyTime(slot.day, startTime, ACADEMY_TIMEZONE, ACADEMY_TIMEZONE),
    minutesUntilStart: Math.round(minutesUntilStart * 10) / 10,
    minutesSinceStart: Math.round(minutesSinceStart * 10) / 10,
    student: {
      _id: student._id.toString(),
      name: student.name,
      studentId: student.studentId ?? undefined,
    },
    teacher: {
      _id: teacher._id.toString(),
      name: teacher.name,
    },
    joins: {
      teacherJoinedAt: joins.teacherJoinedAt,
      studentJoinedAt: joins.studentJoinedAt,
      teacherStatus,
      studentStatus,
    },
    alerts: {
      teacherLate,
      studentNoShow,
      teacherNoShow,
    },
  };
}

export async function getLiveMonitorPayload(): Promise<LiveMonitorPayload> {
  const now = new Date();
  const day = getTodayScheduleDay();
  const sessionDate = getAcademyDateString(now);

  const slots = await SessionSlot.find({ day, isActive: true })
    .populate("class", "title meetingLink isActive")
    .populate("teacher", "name email meetingLink isActive")
    .populate("student", "name email studentId isActive")
    .sort({ startTime: 1 });

  const joinMap = await getJoinMapForDate(sessionDate);

  const sessions: LiveMonitorSession[] = [];
  for (const slot of slots) {
    const classDoc = populatedClass(slot.class);
    if (!classDoc || classDoc.isActive === false) continue;
    const row = buildSessionRow(slot, joinMap, now);
    if (row) sessions.push(row);
  }

  sessions.sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );

  const summary: LiveMonitorSummary = {
    sessionDate,
    day,
    liveCount: sessions.filter((s) => s.sessionPhase === "live").length,
    upcomingCount: sessions.filter((s) => s.sessionPhase === "upcoming").length,
    completedCount: sessions.filter((s) => s.sessionPhase === "completed").length,
    teacherLateCount: sessions.filter((s) => s.alerts.teacherLate).length,
    studentNoShowCount: sessions.filter((s) => s.alerts.studentNoShow).length,
    teacherNoShowCount: sessions.filter((s) => s.alerts.teacherNoShow).length,
    totalToday: sessions.length,
  };

  return {
    summary,
    sessions,
    updatedAt: now.toISOString(),
  };
}

export async function getLiveSummaryForDashboard(): Promise<LiveMonitorSummary> {
  const payload = await getLiveMonitorPayload();
  return payload.summary;
}

export interface PublicLiveDashboardSession {
  studentLabel: string;
  courseLabel: string;
  teacherLabel: string;
  status: "live" | "queued";
  timeLabel: string;
}

export interface PublicLiveDashboardTeacher {
  id: string;
  shortName: string;
  isLive: boolean;
  gender: "male" | "female";
  avatarUrl?: string;
}

export interface PublicLiveDashboard {
  sessions: PublicLiveDashboardSession[];
  teachersOnline: PublicLiveDashboardTeacher[];
  activeTeacherCount: number;
  activeTeacherDisplay: string;
  updatedAt: string;
}

function shortenDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "Student";
  const first = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}

function formatTeacherLabel(name: string): string {
  const withoutHonorific = name.replace(/^(Mst\.|Md\.|Mr\.|Mrs\.|Dr\.)\s+/i, "").trim();
  const first = withoutHonorific.split(/\s+/)[0] ?? "Teacher";
  return `Ust. ${first}`;
}

function formatSessionTimeLabel(
  session: LiveMonitorSession,
  now: Date = new Date()
): string {
  if (session.sessionPhase === "live") {
    const endsAt = new Date(session.endsAt);
    const minsLeft = Math.max(1, Math.round((endsAt.getTime() - now.getTime()) / 60_000));
    return `${minsLeft} min left`;
  }
  if (session.sessionPhase === "upcoming") {
    const mins = Math.max(1, Math.round(session.minutesUntilStart));
    return `Starts in ${mins} min`;
  }
  return "Completed";
}

function formatActiveTeacherDisplay(count: number): string {
  return count >= 10 ? "10+" : String(count);
}

export async function getPublicLiveDashboard(): Promise<PublicLiveDashboard> {
  const payload = await getLiveMonitorPayload();
  const now = new Date();

  const queueSessions = payload.sessions
    .filter((s) => s.sessionPhase === "live" || s.sessionPhase === "upcoming")
    .sort((a, b) => {
      const phaseOrder = { live: 0, upcoming: 1, completed: 2 };
      const phaseDiff = phaseOrder[a.sessionPhase] - phaseOrder[b.sessionPhase];
      if (phaseDiff !== 0) return phaseDiff;
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    })
    .slice(0, 3);

  const sessions: PublicLiveDashboardSession[] = queueSessions.map((session) => ({
    studentLabel: shortenDisplayName(session.student.name),
    courseLabel: session.courseType || session.classTitle,
    teacherLabel: formatTeacherLabel(session.teacher.name),
    status: session.sessionPhase === "live" ? "live" : "queued",
    timeLabel: formatSessionTimeLabel(session, now),
  }));

  const liveTeacherIds = new Set(
    payload.sessions
      .filter((s) => s.sessionPhase === "live" || s.sessionPhase === "upcoming")
      .map((s) => s.teacher._id)
  );

  const teacherDocs = await User.find({
    _id: { $in: [...liveTeacherIds] },
    role: "teacher",
    isActive: true,
  }).select("name gender avatarUrl");

  const teachersOnline: PublicLiveDashboardTeacher[] = teacherDocs
    .map((teacher) => {
      const id = teacher._id.toString();
      const gender: "male" | "female" =
        teacher.gender === "female" ? "female" : "male";
      const isLive = payload.sessions.some(
        (s) => s.sessionPhase === "live" && s.teacher._id === id
      );
      const shortName = formatTeacherLabel(teacher.name).replace(/^Ust\.\s*/, "");
      return {
        id,
        shortName,
        isLive,
        gender,
        avatarUrl: teacher.avatarUrl?.trim() || undefined,
      };
    })
    .sort((a, b) => Number(b.isLive) - Number(a.isLive))
    .slice(0, 4);

  const activeTeacherCount = await User.countDocuments({
    role: "teacher",
    isActive: true,
  });

  return {
    sessions,
    teachersOnline,
    activeTeacherCount,
    activeTeacherDisplay: formatActiveTeacherDisplay(activeTeacherCount),
    updatedAt: payload.updatedAt,
  };
}

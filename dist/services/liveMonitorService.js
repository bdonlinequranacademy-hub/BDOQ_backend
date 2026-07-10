"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLiveMonitorPayload = getLiveMonitorPayload;
exports.getLiveSummaryForDashboard = getLiveSummaryForDashboard;
exports.getPublicLiveDashboard = getPublicLiveDashboard;
const SessionSlot_1 = require("../models/SessionSlot");
const User_1 = require("../models/User");
const sessionJoinService_1 = require("./sessionJoinService");
const scheduleUtils_1 = require("../utils/scheduleUtils");
function getAcademyDateString(now = new Date()) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: scheduleUtils_1.ACADEMY_TIMEZONE,
    }).format(now);
}
function populatedUser(value) {
    if (!value || typeof value !== "object" || !("name" in value))
        return null;
    return value;
}
function populatedClass(value) {
    if (!value || typeof value !== "object" || !("title" in value))
        return null;
    return value;
}
const TEACHER_LATE_MINUTES = 5;
const STUDENT_NO_SHOW_MINUTES = 10;
function resolveJoinStatus(joinedAt, startsAt, now, lateThresholdMinutes) {
    if (!joinedAt)
        return "not_joined";
    const joined = new Date(joinedAt);
    const lateCutoff = new Date(startsAt.getTime() + lateThresholdMinutes * 60000);
    if (joined > lateCutoff)
        return "late";
    return "joined";
}
function buildSessionRow(slot, joinMap, now) {
    const startsAt = (0, scheduleUtils_1.getSessionInstant)(slot.day, slot.startTime);
    if (!startsAt)
        return null;
    const startTime = (0, scheduleUtils_1.normalizeScheduleTime)(slot.startTime) ?? slot.startTime;
    const sessionPhase = slot.sessionPhase ?? (0, scheduleUtils_1.getSessionPhase)(startsAt, slot.durationMinutes, now);
    const endsAt = new Date(startsAt.getTime() + slot.durationMinutes * 60000);
    const minutesUntilStart = (startsAt.getTime() - now.getTime()) / 60000;
    const minutesSinceStart = (now.getTime() - startsAt.getTime()) / 60000;
    const classDoc = populatedClass(slot.class);
    const teacher = populatedUser(slot.teacher);
    const student = populatedUser(slot.student);
    if (!classDoc || !teacher || !student)
        return null;
    const joins = joinMap.get(slot._id.toString()) ?? {};
    const teacherStatus = resolveJoinStatus(joins.teacherJoinedAt, startsAt, now, TEACHER_LATE_MINUTES);
    const studentStatus = resolveJoinStatus(joins.studentJoinedAt, startsAt, now, STUDENT_NO_SHOW_MINUTES);
    const isLiveOrPast = sessionPhase === "live" || sessionPhase === "completed";
    const teacherLate = isLiveOrPast &&
        minutesSinceStart >= TEACHER_LATE_MINUTES &&
        !joins.teacherJoinedAt;
    const studentNoShow = isLiveOrPast &&
        minutesSinceStart >= STUDENT_NO_SHOW_MINUTES &&
        !joins.studentJoinedAt;
    const teacherNoShow = sessionPhase === "completed" && !joins.teacherJoinedAt;
    const meetingLink = classDoc.meetingLink?.trim() || teacher.meetingLink?.trim() || undefined;
    return {
        _id: slot._id.toString(),
        classId: classDoc._id.toString(),
        classTitle: classDoc.title,
        courseType: slot.courseType || classDoc.title,
        durationMinutes: slot.durationMinutes,
        durationLabel: (0, scheduleUtils_1.formatDuration)(slot.durationMinutes),
        day: slot.day,
        meetingLink,
        sessionPhase,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        startTimeLabel: (0, scheduleUtils_1.formatWeeklyTime)(slot.day, startTime, scheduleUtils_1.ACADEMY_TIMEZONE, scheduleUtils_1.ACADEMY_TIMEZONE),
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
async function getLiveMonitorPayload() {
    const now = new Date();
    const day = (0, scheduleUtils_1.getTodayScheduleDay)();
    const sessionDate = getAcademyDateString(now);
    const slots = await SessionSlot_1.SessionSlot.find({ day, isActive: true })
        .populate("class", "title meetingLink isActive")
        .populate("teacher", "name email meetingLink isActive")
        .populate("student", "name email studentId isActive")
        .sort({ startTime: 1 });
    const joinMap = await (0, sessionJoinService_1.getJoinMapForDate)(sessionDate);
    const sessions = [];
    for (const slot of slots) {
        const classDoc = populatedClass(slot.class);
        if (!classDoc || classDoc.isActive === false)
            continue;
        const row = buildSessionRow(slot, joinMap, now);
        if (row)
            sessions.push(row);
    }
    sessions.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    const summary = {
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
async function getLiveSummaryForDashboard() {
    const payload = await getLiveMonitorPayload();
    return payload.summary;
}
function shortenDisplayName(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1)
        return parts[0] ?? "Student";
    const first = parts[0];
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${first} ${lastInitial}.`;
}
function formatTeacherLabel(name) {
    const withoutHonorific = name.replace(/^(Mst\.|Md\.|Mr\.|Mrs\.|Dr\.)\s+/i, "").trim();
    const first = withoutHonorific.split(/\s+/)[0] ?? "Teacher";
    return `Ust. ${first}`;
}
function formatSessionTimeLabel(session, now = new Date()) {
    if (session.sessionPhase === "live") {
        const endsAt = new Date(session.endsAt);
        const minsLeft = Math.max(1, Math.round((endsAt.getTime() - now.getTime()) / 60000));
        return `${minsLeft} min left`;
    }
    if (session.sessionPhase === "upcoming") {
        const mins = Math.max(1, Math.round(session.minutesUntilStart));
        return `Starts in ${mins} min`;
    }
    return "Completed";
}
function formatActiveTeacherDisplay(count) {
    return count >= 10 ? "10+" : String(count);
}
async function getPublicLiveDashboard() {
    const payload = await getLiveMonitorPayload();
    const now = new Date();
    const queueSessions = payload.sessions
        .filter((s) => s.sessionPhase === "live" || s.sessionPhase === "upcoming")
        .sort((a, b) => {
        const phaseOrder = { live: 0, upcoming: 1, completed: 2 };
        const phaseDiff = phaseOrder[a.sessionPhase] - phaseOrder[b.sessionPhase];
        if (phaseDiff !== 0)
            return phaseDiff;
        return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    })
        .slice(0, 3);
    const sessions = queueSessions.map((session) => ({
        studentLabel: shortenDisplayName(session.student.name),
        courseLabel: session.courseType || session.classTitle,
        teacherLabel: formatTeacherLabel(session.teacher.name),
        status: session.sessionPhase === "live" ? "live" : "queued",
        timeLabel: formatSessionTimeLabel(session, now),
    }));
    const liveTeacherIds = new Set(payload.sessions
        .filter((s) => s.sessionPhase === "live" || s.sessionPhase === "upcoming")
        .map((s) => s.teacher._id));
    const teacherDocs = await User_1.User.find({
        _id: { $in: [...liveTeacherIds] },
        role: "teacher",
        isActive: true,
    }).select("name gender avatarUrl");
    const teachersOnline = teacherDocs
        .map((teacher) => {
        const id = teacher._id.toString();
        const gender = teacher.gender === "female" ? "female" : "male";
        const isLive = payload.sessions.some((s) => s.sessionPhase === "live" && s.teacher._id === id);
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
    const activeTeacherCount = await User_1.User.countDocuments({
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

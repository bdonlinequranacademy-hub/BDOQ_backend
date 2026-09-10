import { Request, Response } from "express";
import mongoose from "mongoose";
import { IUser, User } from "../models/User";
import { Class } from "../models/Class";
import { Attendance } from "../models/Attendance";
import { Progress } from "../models/Progress";
import { Homework } from "../models/Homework";
import { TeacherProfile } from "../models/TeacherProfile";
import { StudentBilling } from "../models/StudentBilling";
import { PaymentRecord } from "../models/PaymentRecord";
import { ClassLog } from "../models/ClassLog";
import { StudentRequest } from "../models/StudentRequest";
import { Certificate } from "../models/Certificate";
import { canManageUser } from "../lib/adminRoles";
import { avatarFieldsFromUser } from "../lib/avatarFields";
import { getTeacherEarnings } from "../services/earningsService";
import { StudentAdmissionApplication } from "../models/StudentAdmissionApplication";
import { buildEnrollmentSummaryFromAdmission } from "../services/userProfileSyncService";
import type { IParentInfo } from "../models/User";

const getActor = (req: Request): IUser => req.user as IUser;

function yearsSince(date?: Date | null): number {
  if (!date) return 0;
  const ms = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000)));
}

function currentMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatBaseUser(user: IUser) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive !== false,
    studentId: user.studentId ?? undefined,
    gender: user.gender ?? undefined,
    timezone: user.timezone ?? "Asia/Dhaka",
    country: user.country ?? undefined,
    whatsapp: user.whatsapp ?? undefined,
    meetingLink: user.meetingLink ?? undefined,
    bankName: user.bankName ?? undefined,
    bankAccount: user.bankAccount ?? undefined,
    bKashNumber: user.bKashNumber ?? undefined,
    curriculumAssignments: user.curriculumAssignments ?? [],
    parentInfo: user.parentInfo ?? undefined,
    sourceAdmissionId: user.sourceAdmissionId?.toString(),
    profileNotes: user.profileNotes ?? undefined,
    emailVerified: user.emailVerified === true,
    authProvider: user.authProvider ?? "local",
    createdAt: user.createdAt,
    ...avatarFieldsFromUser(user),
  };
}

export const getUserProfileDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
        data: null,
      });
      return;
    }

    const user = await User.findById(id).select("-password");
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
      return;
    }

    const actor = getActor(req);
    if (!canManageUser(actor, user) && user.role !== actor.role) {
      res.status(403).json({
        success: false,
        message: "You cannot view this user account",
        data: null,
      });
      return;
    }

    const base = formatBaseUser(user);
    const role = base.role;

    if (role === "teacher") {
      const month = currentMonthKey();
      const [classes, publicDoc, classLogs, homeworkDocs, studentRequests, earnings] =
        await Promise.all([
          Class.find({ teacher: user._id })
            .select(
              "title description schedule meetingLink sessionRateBdt isActive students createdAt"
            )
            .populate("students", "name email studentId country whatsapp isActive")
            .sort({ createdAt: -1 })
            .lean(),
          TeacherProfile.findOne({ linkedUserId: user._id })
            .lean()
            .then(async (linked) => {
              if (linked) return linked;
              return TeacherProfile.findOne({ name: user.name }).lean();
            }),
          ClassLog.find({ teacher: user._id })
            .select(
              "sessionDate durationMinutes courseType lessonReport status earningsBdt student class createdAt"
            )
            .populate("student", "name studentId")
            .populate("class", "title")
            .sort({ sessionDate: -1 })
            .limit(15)
            .lean(),
          Homework.find({ teacher: user._id })
            .select("title dueDate class submissions createdAt")
            .populate("class", "title")
            .sort({ createdAt: -1 })
            .limit(10)
            .lean(),
          StudentRequest.find({ teacher: user._id })
            .select("status message preferredCourseType createdAt updatedAt")
            .sort({ createdAt: -1 })
            .limit(10)
            .lean(),
          getTeacherEarnings(user._id as mongoose.Types.ObjectId, month),
        ]);

      const studentsMap = new Map<
        string,
        {
          _id: string;
          name: string;
          email: string;
          studentId?: string;
          country?: string;
          whatsapp?: string;
          isActive: boolean;
          classTitles: string[];
        }
      >();

      for (const cls of classes) {
        const studentList = (cls.students ?? []) as Array<{
          _id?: mongoose.Types.ObjectId;
          name?: string;
          email?: string;
          studentId?: string;
          country?: string;
          whatsapp?: string;
          isActive?: boolean;
        }>;
        for (const s of studentList) {
          if (!s?._id) continue;
          const sid = String(s._id);
          const existing = studentsMap.get(sid);
          if (existing) {
            if (!existing.classTitles.includes(cls.title)) {
              existing.classTitles.push(cls.title);
            }
          } else {
            studentsMap.set(sid, {
              _id: sid,
              name: s.name ?? "Student",
              email: s.email ?? "",
              studentId: s.studentId,
              country: s.country,
              whatsapp: s.whatsapp,
              isActive: s.isActive !== false,
              classTitles: [cls.title],
            });
          }
        }
      }

      const students = Array.from(studentsMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      const scheduleSlots = classes
        .filter(
          (cls) =>
            cls.isActive !== false &&
            cls.schedule &&
            typeof cls.schedule === "object" &&
            "day" in cls.schedule &&
            "time" in cls.schedule
        )
        .map((cls) => {
          const schedule = cls.schedule as {
            day: string;
            time: string;
            duration?: number;
          };
          return {
            day: schedule.day,
            time: schedule.time,
            duration: schedule.duration ?? 60,
            classTitle: cls.title,
            classId: String(cls._id),
          };
        })
        .sort((a, b) => a.day.localeCompare(b.day) || a.time.localeCompare(b.time));

      const experienceLabel =
        publicDoc?.experience?.trim() ||
        (yearsSince(user.createdAt) > 0
          ? `${yearsSince(user.createdAt)}+ years with BOQ Academy`
          : "New teacher");

      const logsPending = classLogs.filter((l) => l.status === "pending").length;
      const logsApproved = await ClassLog.countDocuments({
        teacher: user._id,
        status: "approved",
      });
      const homeworkAssigned = await Homework.countDocuments({ teacher: user._id });

      res.status(200).json({
        success: true,
        message: "Teacher profile fetched successfully",
        data: {
          kind: "teacher" as const,
          user: base,
          publicProfile: publicDoc
            ? {
                slug: publicDoc.slug,
                title: publicDoc.role,
                bio: publicDoc.bio,
                about: publicDoc.about ?? "",
                qualifications: publicDoc.qualifications ?? [],
                skills: publicDoc.skills ?? [],
                experience: publicDoc.experience ?? "",
                languages: publicDoc.languages ?? [],
                showOnWebsite: publicDoc.showOnWebsite !== false,
                featured: publicDoc.featured === true,
              }
            : null,
          stats: {
            activeClasses: classes.filter((c) => c.isActive !== false).length,
            totalClasses: classes.length,
            totalStudents: students.length,
            experienceLabel,
            yearsOnPlatform: yearsSince(user.createdAt),
            homeworkAssigned,
            classLogsApproved: logsApproved,
            classLogsPending: logsPending,
            earningsMonthBdt: earnings.totalBdt,
            earningsPendingBdt: earnings.pendingBdt,
            verifiedSessionsThisMonth: earnings.verifiedSessions,
          },
          classes: classes.map((cls) => ({
            _id: String(cls._id),
            title: cls.title,
            description: cls.description ?? "",
            schedule: cls.schedule ?? null,
            meetingLink: cls.meetingLink ?? "",
            sessionRateBdt: cls.sessionRateBdt ?? 0,
            isActive: cls.isActive !== false,
            studentCount: Array.isArray(cls.students) ? cls.students.length : 0,
            createdAt: cls.createdAt,
          })),
          scheduleSlots,
          students,
          recentClassLogs: classLogs.map((log) => {
            const student = log.student as {
              name?: string;
              studentId?: string;
              _id?: mongoose.Types.ObjectId;
            } | null;
            const cls = log.class as {
              title?: string;
              _id?: mongoose.Types.ObjectId;
            } | null;
            return {
              _id: String(log._id),
              sessionDate: log.sessionDate,
              durationMinutes: log.durationMinutes,
              courseType: log.courseType,
              lessonReport: log.lessonReport ?? "",
              status: log.status,
              earningsBdt: log.earningsBdt ?? 0,
              studentName: student?.name ?? "Student",
              studentId: student?.studentId,
              classTitle: cls?.title ?? "Class",
              createdAt: log.createdAt,
            };
          }),
          recentHomework: homeworkDocs.map((hw) => {
            const cls = hw.class as {
              title?: string;
              _id?: mongoose.Types.ObjectId;
            } | null;
            const submissions = Array.isArray(hw.submissions) ? hw.submissions : [];
            return {
              _id: String(hw._id),
              title: hw.title,
              dueDate: hw.dueDate,
              classTitle: cls?.title ?? "Class",
              submissionCount: submissions.length,
              createdAt: hw.createdAt,
            };
          }),
          studentRequests: studentRequests.map((r) => ({
            _id: String(r._id),
            status: r.status,
            message: r.message ?? "",
            preferredCourseType: r.preferredCourseType ?? "",
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          })),
          earnings: {
            month: earnings.month,
            totalBdt: earnings.totalBdt,
            verifiedSessions: earnings.verifiedSessions,
            pendingSessions: earnings.pendingSessions,
            pendingBdt: earnings.pendingBdt,
            rejectedSessions: earnings.rejectedSessions,
          },
        },
      });
      return;
    }

    if (role === "student") {
      const classes = await Class.find({ students: user._id })
        .select(
          "title description schedule meetingLink meetingPlatform isActive teacher students sessionRateBdt createdAt"
        )
        .populate("teacher", "name email whatsapp country gender")
        .sort({ createdAt: -1 })
        .lean();

      const admission = user.sourceAdmissionId
        ? await StudentAdmissionApplication.findById(user.sourceAdmissionId).lean()
        : await StudentAdmissionApplication.findOne({ linkedUserId: user._id })
            .sort({ createdAt: -1 })
            .lean();

      const classIds = classes.map((cls) => cls._id);

      const [
        attendanceDocs,
        recentAttendance,
        progressDocs,
        homeworkDocs,
        billing,
        payments,
        certificates,
      ] = await Promise.all([
        Attendance.find({ student: user._id }).select("status date").lean(),
        Attendance.find({ student: user._id })
          .select("status date class")
          .populate("class", "title")
          .sort({ date: -1 })
          .limit(12)
          .lean(),
        Progress.find({ student: user._id })
          .select(
            "surahsCompleted tajweedScore memorizedAyahs curriculumProgram curriculumUnit curriculumTopic notes updatedAt class"
          )
          .populate("class", "title")
          .sort({ updatedAt: -1 })
          .limit(15)
          .lean(),
        classIds.length > 0
          ? Homework.find({ class: { $in: classIds } })
              .select("title dueDate submissions class teacher createdAt")
              .populate("class", "title")
              .populate("teacher", "name")
              .sort({ dueDate: -1 })
              .limit(15)
              .lean()
          : Promise.resolve([]),
        StudentBilling.findOne({ student: user._id }).lean(),
        PaymentRecord.find({ student: user._id })
          .select("amount currency status method createdAt note")
          .sort({ createdAt: -1 })
          .limit(20)
          .lean(),
        user.studentId
          ? Certificate.find({ studentPortalId: user.studentId })
              .select("certificateId courseName issueDate grade createdAt")
              .sort({ issueDate: -1 })
              .limit(10)
              .lean()
          : Promise.resolve([]),
      ]);

      const present = attendanceDocs.filter((a) => a.status === "present").length;
      const absent = attendanceDocs.filter((a) => a.status === "absent").length;
      const late = attendanceDocs.filter((a) => a.status === "late").length;
      const totalAttendance = attendanceDocs.length;
      const attendanceRate =
        totalAttendance > 0
          ? Math.round(((present + late) / totalAttendance) * 100)
          : null;

      let pendingHomework = 0;
      let submittedHomework = 0;
      const homeworkItems = homeworkDocs.map((hw) => {
        const sub = (
          hw.submissions as
            | Array<{
                student?: mongoose.Types.ObjectId;
                status?: string;
                submittedAt?: Date;
                grade?: string;
              }>
            | undefined
        )?.find((s) => String(s.student) === String(user._id));
        if (sub) submittedHomework += 1;
        else pendingHomework += 1;
        const cls = hw.class as { title?: string } | null;
        const teacher = hw.teacher as { name?: string } | null;
        return {
          _id: String(hw._id),
          title: hw.title,
          dueDate: hw.dueDate,
          classTitle: cls?.title ?? "Class",
          teacherName: teacher?.name ?? "Teacher",
          submitted: Boolean(sub),
          grade: sub?.grade ?? null,
          submittedAt: sub?.submittedAt ?? null,
        };
      });

      res.status(200).json({
        success: true,
        message: "Student profile fetched successfully",
        data: {
          kind: "student" as const,
          user: base,
          parentInfo: (user.parentInfo as IParentInfo | undefined) ?? undefined,
          profileNotes: user.profileNotes ?? undefined,
          enrollment: admission
            ? buildEnrollmentSummaryFromAdmission(
                admission as InstanceType<typeof StudentAdmissionApplication>
              )
            : null,
          applicationData: admission?.formData ?? null,
          applicationId: admission ? String(admission._id) : null,
          stats: {
            activeClasses: classes.filter((c) => c.isActive !== false).length,
            totalClasses: classes.length,
            attendanceRate,
            attendancePresent: present,
            attendanceAbsent: absent,
            attendanceLate: late,
            attendanceTotal: totalAttendance,
            pendingHomework,
            submittedHomework,
            yearsOnPlatform: yearsSince(user.createdAt),
            certificatesCount: certificates.length,
            paymentsCount: payments.length,
          },
          classes: classes.map((cls) => {
            const teacher = cls.teacher as
              | {
                  _id?: mongoose.Types.ObjectId;
                  name?: string;
                  email?: string;
                  whatsapp?: string;
                  country?: string;
                  gender?: string;
                }
              | mongoose.Types.ObjectId
              | null;
            const teacherObj =
              teacher && typeof teacher === "object" && "name" in teacher
                ? {
                    _id: String(teacher._id),
                    name: teacher.name ?? "Teacher",
                    email: teacher.email ?? "",
                    whatsapp: teacher.whatsapp ?? "",
                    country: teacher.country ?? "",
                    gender: teacher.gender ?? "",
                  }
                : null;
            return {
              _id: String(cls._id),
              title: cls.title,
              description: cls.description ?? "",
              schedule: cls.schedule ?? null,
              meetingLink: cls.meetingLink ?? "",
              meetingPlatform: cls.meetingPlatform ?? undefined,
              isActive: cls.isActive !== false,
              teacher: teacherObj,
              createdAt: cls.createdAt,
            };
          }),
          progress: progressDocs.map((p) => {
            const cls = p.class as { title?: string } | null;
            return {
              _id: String(p._id),
              surahs: p.surahsCompleted ?? [],
              tajweedScore: p.tajweedScore ?? null,
              memorizedAyahs: p.memorizedAyahs ?? 0,
              curriculumProgram: p.curriculumProgram ?? "",
              curriculumUnit: p.curriculumUnit ?? "",
              curriculumTopic: p.curriculumTopic ?? "",
              notes: p.notes ?? "",
              classTitle: cls?.title ?? "",
              updatedAt: p.updatedAt,
            };
          }),
          recentAttendance: recentAttendance.map((a) => {
            const cls = a.class as { title?: string } | null;
            return {
              _id: String(a._id),
              status: a.status,
              date: a.date,
              classTitle: cls?.title ?? "Class",
            };
          }),
          homework: homeworkItems,
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
            method: (p as { method?: string }).method ?? "",
            createdAt: p.createdAt,
          })),
          certificates: certificates.map((c) => ({
            _id: String(c._id),
            certificateId: c.certificateId,
            courseName: c.courseName,
            issueDate: c.issueDate,
            grade: c.grade,
          })),
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User profile fetched successfully",
      data: {
        kind: "staff" as const,
        user: base,
        stats: {
          yearsOnPlatform: yearsSince(user.createdAt),
        },
      },
    });
  } catch (err) {
    console.error("[admin] getUserProfileDetail failed:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user profile",
      data: null,
    });
  }
};

export const updateUserApplicationData = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
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
    console.error("[admin] updateUserApplicationData failed:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update application data",
      data: null,
    });
  }
};

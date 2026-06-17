import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { IUser, User, UserRole, UserGender } from "../models/User";
import { Class, ScheduleDay } from "../models/Class";
import { Homework } from "../models/Homework";
import { Attendance } from "../models/Attendance";
import { Progress } from "../models/Progress";
import { createUserNotification, createUserNotifications } from "../services/notificationService";
import { ClassLog } from "../models/ClassLog";
import { TrialBooking } from "../models/TrialBooking";
import { ContactMessage } from "../models/ContactMessage";
import { ConcernReport } from "../models/ConcernReport";
import { StudentRequest } from "../models/StudentRequest";
import { countPendingPayments } from "../services/paymentReminderService";
import { generateStudentId } from "../utils/studentId";
import { syncSlotsFromClass } from "../services/scheduleService";
import { parseClassSchedule } from "../utils/scheduleUtils";
import { parseCurriculumAssignments, mapProgressDocsWithLabels, resolveCurriculumLabels } from "../services/curriculumService";
import {
  assignableRolesFor,
  canAssignRole,
  canManageUser,
  isSuperAdmin,
  usersListFilterFor,
} from "../lib/adminRoles";

const DAY_NAMES: ScheduleDay[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const ASSIGNABLE_ROLES: UserRole[] = ["student", "teacher", "admin", "super_admin"];

const getActor = (req: Request): IUser => req.user as IUser;

const formatUser = (user: IUser) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role === "parent" ? "student" : user.role,
  isActive: user.isActive,
  children: user.children?.map((id) => id.toString()) ?? [],
  studentId: user.studentId ?? undefined,
  gender: user.gender ?? undefined,
  timezone: user.timezone ?? "Asia/Dhaka",
  country: user.country ?? undefined,
  curriculumAssignments: user.curriculumAssignments ?? [],
  createdAt: user.createdAt,
});

export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const actor = getActor(req);
    const { role, gender } = req.query;
    const filter: Record<string, unknown> = { ...usersListFilterFor(actor) };

    if (role) {
      if (role === "parent") {
        res.status(400).json({
          success: false,
          message: "Parent role is no longer used. Use student.",
          data: null,
        });
        return;
      }
      if (role === "super_admin" && !isSuperAdmin(actor.role)) {
        res.status(403).json({
          success: false,
          message: "Only the super admin can filter super admin accounts",
          data: null,
        });
        return;
      }
      if (!ASSIGNABLE_ROLES.includes(role as UserRole)) {
        res.status(400).json({
          success: false,
          message: "Invalid role filter",
          data: null,
        });
        return;
      }
      filter.role = role as string;
    }

    if (gender === "male" || gender === "female") {
      filter.gender = gender;
    }

    const users = await User.find(filter).select("-password").sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: users.map((u) => formatUser(u)),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      data: null,
    });
  }
};

export const getUserById = async (
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

    res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: formatUser(user),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      data: null,
    });
  }
};

export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const actor = getActor(req);
    const { name, email, password, role, gender, timezone, country, curriculumAssignments } =
      req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
        data: null,
      });
      return;
    }

    if (role && role === "parent") {
      res.status(400).json({
        success: false,
        message: "Parent role is no longer used. Use student.",
        data: null,
      });
      return;
    }

    if (role && !ASSIGNABLE_ROLES.includes(role)) {
      res.status(400).json({
        success: false,
        message: "Invalid role",
        data: null,
      });
      return;
    }

    const assignRole = (role || "student") as UserRole;

    if (assignRole === "super_admin") {
      res.status(403).json({
        success: false,
        message: "Super admin accounts cannot be created from the portal",
        data: null,
      });
      return;
    }

    if (!canAssignRole(actor, assignRole)) {
      res.status(403).json({
        success: false,
        message: "You are not allowed to create this role",
        data: null,
      });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "Email already exists",
        data: null,
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userPayload: Record<string, unknown> = {
      name,
      email,
      password: hashedPassword,
      role: assignRole,
      emailVerified: true,
    };

    if (assignRole === "student" || assignRole === "teacher") {
      if (typeof country !== "string" || !country.trim()) {
        res.status(400).json({
          success: false,
          message: "Country is required for students and teachers",
          data: null,
        });
        return;
      }
      userPayload.country = country.trim();
    }

    if (assignRole === "student") {
      userPayload.studentId = await generateStudentId();
      userPayload.timezone =
        typeof timezone === "string" && timezone.trim()
          ? timezone.trim()
          : "Asia/Dhaka";
      const parsedCurriculum = parseCurriculumAssignments(curriculumAssignments);
      if (parsedCurriculum) {
        userPayload.curriculumAssignments = parsedCurriculum;
      }
    }

    if (assignRole === "teacher" && gender) {
      if (gender !== "male" && gender !== "female") {
        res.status(400).json({
          success: false,
          message: "Teacher gender must be male or female",
          data: null,
        });
        return;
      }
      userPayload.gender = gender as UserGender;
    }

    const user = await User.create(userPayload);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: formatUser(user),
    });
  } catch (err) {
    console.error("[admin] createUser failed:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
      data: null,
    });
  }
};

export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const actor = getActor(req);
    const { id } = req.params;
    const { name, email, role, isActive, children, gender, timezone, country, curriculumAssignments } =
      req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
        data: null,
      });
      return;
    }

    if (role && role === "parent") {
      res.status(400).json({
        success: false,
        message: "Parent role is no longer used. Use student.",
        data: null,
      });
      return;
    }

    if (role && !ASSIGNABLE_ROLES.includes(role)) {
      res.status(400).json({
        success: false,
        message: "Invalid role",
        data: null,
      });
      return;
    }

    if (role === "super_admin") {
      res.status(403).json({
        success: false,
        message: "Super admin role cannot be assigned from the portal",
        data: null,
      });
      return;
    }

    const target = await User.findById(id);
    if (!target) {
      res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
      return;
    }

    if (!canManageUser(actor, target)) {
      res.status(403).json({
        success: false,
        message: "You are not allowed to update this user",
        data: null,
      });
      return;
    }

    if (role !== undefined && !canAssignRole(actor, role as UserRole)) {
      res.status(403).json({
        success: false,
        message: "You are not allowed to assign this role",
        data: null,
      });
      return;
    }

    if (email) {
      const duplicate = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: id },
      });

      if (duplicate) {
        res.status(400).json({
          success: false,
          message: "Email already exists",
          data: null,
        });
        return;
      }
    }

    if (children !== undefined) {
      if (!Array.isArray(children)) {
        res.status(400).json({
          success: false,
          message: "children must be an array of student IDs",
          data: null,
        });
        return;
      }

      const childIds = children as string[];
      for (const childId of childIds) {
        if (!mongoose.Types.ObjectId.isValid(childId)) {
          res.status(400).json({
            success: false,
            message: `Invalid child ID: ${childId}`,
            data: null,
          });
          return;
        }
      }

      if (childIds.length > 0) {
        const students = await User.find({
          _id: { $in: childIds },
          role: "student",
        });

        if (students.length !== childIds.length) {
          res.status(400).json({
            success: false,
            message: "All linked children must be valid student accounts",
            data: null,
          });
          return;
        }
      }
    }

    const updateData: Record<string, unknown> = {};
    const unsetData: Record<string, 1> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (children !== undefined) updateData.children = children;

    if (gender !== undefined) {
      if (gender === null || gender === "") {
        unsetData.gender = 1;
      } else if (gender === "male" || gender === "female") {
        updateData.gender = gender;
      } else {
        res.status(400).json({
          success: false,
          message: "Gender must be male or female",
          data: null,
        });
        return;
      }
    }
    if (timezone !== undefined) {
      updateData.timezone =
        typeof timezone === "string" && timezone.trim()
          ? timezone.trim()
          : "Asia/Dhaka";
    }
    if (country !== undefined) {
      const trimmed = typeof country === "string" ? country.trim() : "";
      const targetRole = role as UserRole | undefined;
      if (
        !trimmed &&
        (targetRole === "student" || targetRole === "teacher")
      ) {
        res.status(400).json({
          success: false,
          message: "Country is required for students and teachers",
          data: null,
        });
        return;
      }
      updateData.country = trimmed;
    }
    if (curriculumAssignments !== undefined) {
      const parsed = parseCurriculumAssignments(curriculumAssignments);
      if (parsed === null) {
        res.status(400).json({
          success: false,
          message: "curriculumAssignments must be an array",
          data: null,
        });
        return;
      }
      updateData.curriculumAssignments = parsed;
    }

    const mongoUpdate: Record<string, unknown> = { ...updateData };
    if (Object.keys(unsetData).length > 0) {
      mongoUpdate.$unset = unsetData;
    }

    const user = await User.findByIdAndUpdate(id, mongoUpdate, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: formatUser(user),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to update user",
      data: null,
    });
  }
};

export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const actor = getActor(req);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
        data: null,
      });
      return;
    }

    const target = await User.findById(id);
    if (!target) {
      res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
      return;
    }

    if (!canManageUser(actor, target)) {
      res.status(403).json({
        success: false,
        message: "You are not allowed to deactivate this user",
        data: null,
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).select("-password");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User deactivated successfully",
      data: null,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      data: null,
    });
  }
};

export const deleteClass = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid class ID",
        data: null,
      });
      return;
    }

    const classDoc = await Class.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!classDoc) {
      res.status(404).json({
        success: false,
        message: "Class not found",
        data: null,
      });
      return;
    }

    await syncSlotsFromClass(classDoc);

    res.status(200).json({
      success: true,
      message: "Class deactivated successfully",
      data: null,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to delete class",
      data: null,
    });
  }
};

export const createClass = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      title,
      description,
      teacherId,
      studentIds,
      schedule,
      meetingLink,
      sessionRateBdt,
    } = req.body;

    if (!title || !teacherId) {
      res.status(400).json({
        success: false,
        message: "Please provide title and teacherId",
        data: null,
      });
      return;
    }

    const teacher = await User.findOne({ _id: teacherId, role: "teacher" });

    if (!teacher) {
      res.status(400).json({
        success: false,
        message: "Teacher not found or user is not a teacher",
        data: null,
      });
      return;
    }

    const parsedSchedule = parseClassSchedule(schedule);
    if (!parsedSchedule) {
      res.status(400).json({
        success: false,
        message:
          "Schedule must include a valid weekday and time in 24-hour format (e.g. 09:00, Bangladesh time).",
        data: null,
      });
      return;
    }

    const classDoc = await Class.create({
      title,
      description:
        typeof description === "string" && description.trim()
          ? description.trim()
          : undefined,
      teacher: teacherId,
      students: studentIds || [],
      schedule: parsedSchedule,
      meetingLink,
      sessionRateBdt,
    });

    const students = studentIds || [];

    if (students.length > 0) {
      await createUserNotifications(
        students.map((studentId: mongoose.Types.ObjectId) => ({
          userId: studentId,
          title: "Class Enrollment",
          message: `You have been enrolled in ${title}`,
          type: "class" as const,
        }))
      );
    }

    await syncSlotsFromClass(classDoc);

    res.status(201).json({
      success: true,
      message: "Class created successfully",
      data: classDoc,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to create class",
      data: null,
    });
  }
};

export const updateClass = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      teacherId,
      studentIds,
      schedule,
      meetingLink,
      isActive,
      sessionRateBdt,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid class ID",
        data: null,
      });
      return;
    }

    if (teacherId) {
      const teacher = await User.findOne({ _id: teacherId, role: "teacher" });

      if (!teacher) {
        res.status(400).json({
          success: false,
          message: "Teacher not found or user is not a teacher",
          data: null,
        });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (teacherId !== undefined) updateData.teacher = teacherId;
    if (studentIds !== undefined) updateData.students = studentIds;
    if (schedule !== undefined) {
      const parsedSchedule = parseClassSchedule(schedule);
      if (!parsedSchedule) {
        res.status(400).json({
          success: false,
          message:
            "Schedule must include a valid weekday and time in 24-hour format (e.g. 09:00, Bangladesh time).",
          data: null,
        });
        return;
      }
      updateData.schedule = parsedSchedule;
    }
    if (meetingLink !== undefined) updateData.meetingLink = meetingLink;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sessionRateBdt !== undefined) updateData.sessionRateBdt = sessionRateBdt;

    const classDoc = await Class.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("teacher", "name email")
      .populate("students", "name email country studentId timezone");

    if (!classDoc) {
      res.status(404).json({
        success: false,
        message: "Class not found",
        data: null,
      });
      return;
    }

    await syncSlotsFromClass(classDoc);

    res.status(200).json({
      success: true,
      message: "Class updated successfully",
      data: classDoc,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to update class",
      data: null,
    });
  }
};

export const getClassById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid class ID",
        data: null,
      });
      return;
    }

    const classDoc = await Class.findById(id)
      .populate("teacher", "name email")
      .populate("students", "name email country studentId timezone");

    if (!classDoc) {
      res.status(404).json({
        success: false,
        message: "Class not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Class fetched successfully",
      data: classDoc,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch class",
      data: null,
    });
  }
};

export const getAllClasses = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const classes = await Class.find()
      .populate("teacher", "name email")
      .populate("students", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Classes fetched successfully",
      data: classes,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch classes",
      data: null,
    });
  }
};

export const getDashboardStats = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const today = DAY_NAMES[new Date().getDay()];

    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      activeClasses,
      todaysClasses,
      newTrials,
      newContacts,
      pendingClassLogs,
      newConcernReports,
      pendingPayments,
      pendingStudentRequests,
      studentsWithPrograms,
      progressMissingProgram,
      logsMissingProgram,
    ] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "teacher" }),
      Class.countDocuments(),
      Class.countDocuments({ isActive: true }),
      Class.find({ "schedule.day": today, isActive: true })
        .select("title teacher students schedule meetingLink")
        .populate("teacher", "name")
        .lean(),
      TrialBooking.countDocuments({ status: "new" }),
      ContactMessage.countDocuments({ status: "new" }),
      ClassLog.countDocuments({ status: "pending" }),
      ConcernReport.countDocuments({ status: "new" }),
      countPendingPayments(),
      StudentRequest.countDocuments({ status: "pending" }),
      User.countDocuments({
        role: "student",
        "curriculumAssignments.0": { $exists: true },
      }),
      Progress.countDocuments({
        $or: [
          { curriculumProgram: { $exists: false } },
          { curriculumProgram: null },
          { curriculumProgram: "" },
        ],
      }),
      ClassLog.countDocuments({
        $or: [
          { curriculumProgram: { $exists: false } },
          { curriculumProgram: null },
          { curriculumProgram: "" },
        ],
      }),
    ]);

    res.status(200).json({
      success: true,
      message: "Dashboard stats fetched successfully",
      data: {
        totalStudents,
        totalTeachers,
        totalClasses,
        activeClasses,
        todaysClasses,
        pendingActions: {
          newTrials,
          newContacts,
          pendingClassLogs,
          newConcernReports,
          pendingPayments,
          pendingStudentRequests,
        },
        curriculumCoverage: {
          studentsWithPrograms,
          totalStudents,
          progressMissingProgram,
          logsMissingProgram,
        },
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      data: null,
    });
  }
};

export const getAllHomework = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const homework = await Homework.find()
      .populate("class", "title students")
      .populate("teacher", "name")
      .sort({ dueDate: -1 });

    const homeworkWithCounts = homework.map((hw) => {
      const classDoc = hw.class as unknown as {
        _id: mongoose.Types.ObjectId;
        title: string;
        students?: mongoose.Types.ObjectId[];
      } | null;
      const teacherDoc = hw.teacher as unknown as {
        _id: mongoose.Types.ObjectId;
        name: string;
      } | null;
      const totalStudents = classDoc?.students?.length ?? 0;
      const gradedCount = hw.submissions.filter((s) => s.grade).length;
      const pendingGradeCount = hw.submissions.filter(
        (s) => s.submittedAt && !s.grade
      ).length;

      return {
        _id: hw._id,
        title: hw.title,
        description: hw.description,
        class: classDoc,
        teacher: teacherDoc,
        dueDate: hw.dueDate,
        curriculumProgram: hw.curriculumProgram,
        curriculumUnit: hw.curriculumUnit,
        curriculumTopic: hw.curriculumTopic,
        curriculumLabels: resolveCurriculumLabels(
          hw.curriculumProgram,
          hw.curriculumUnit,
          hw.curriculumTopic
        ),
        submissionCount: hw.submissions.filter((s) => s.submittedAt).length,
        totalStudents,
        gradedCount,
        pendingGradeCount,
        createdAt: hw.createdAt,
        updatedAt: hw.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      message: "Homework fetched successfully",
      data: homeworkWithCounts,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch homework",
      data: null,
    });
  }
};

export const deleteAdminHomework = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid homework ID",
        data: null,
      });
      return;
    }

    const homework = await Homework.findById(id);
    if (!homework) {
      res.status(404).json({
        success: false,
        message: "Homework not found",
        data: null,
      });
      return;
    }

    await homework.deleteOne();

    res.status(200).json({
      success: true,
      message: "Homework deleted successfully",
      data: { homeworkId: id },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to delete homework",
      data: null,
    });
  }
};

export const getAttendanceOverview = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { classId } = req.query;

    if (classId && typeof classId === "string") {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        res.status(400).json({
          success: false,
          message: "Invalid class ID",
          data: null,
        });
        return;
      }
    }

    const filter =
      classId && typeof classId === "string" ? { class: classId } : {};

    const records = await Attendance.find(filter).populate("class", "title");

    const classMap = new Map<
      string,
      {
        class: { title: string };
        total: number;
        present: number;
        absent: number;
        late: number;
      }
    >();

    for (const record of records) {
      const classDoc = record.class as unknown as {
        _id: mongoose.Types.ObjectId;
        title: string;
      };
      const key = classDoc._id.toString();

      if (!classMap.has(key)) {
        classMap.set(key, {
          class: { title: classDoc.title },
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
        });
      }

      const entry = classMap.get(key)!;
      entry.total++;
      if (record.status === "present") entry.present++;
      else if (record.status === "absent") entry.absent++;
      else if (record.status === "late") entry.late++;
    }

    const overview = Array.from(classMap.values()).map((entry) => ({
      class: entry.class,
      total: entry.total,
      present: entry.present,
      absent: entry.absent,
      percentage:
        entry.total > 0
          ? Math.round(((entry.present + entry.late) / entry.total) * 100)
          : 0,
    }));

    res.status(200).json({
      success: true,
      message: "Attendance overview fetched successfully",
      data: overview,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance overview",
      data: null,
    });
  }
};

export const getAllProgress = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { classId } = req.query;

    if (classId && typeof classId === "string") {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        res.status(400).json({
          success: false,
          message: "Invalid class ID",
          data: null,
        });
        return;
      }
    }

    const filter =
      classId && typeof classId === "string" ? { class: classId } : {};

    const progress = await Progress.find(filter)
      .populate("student", "name email")
      .populate("class", "title")
      .populate("updatedBy", "name")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      message: "Progress fetched successfully",
      data: mapProgressDocsWithLabels(progress),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch progress",
      data: null,
    });
  }
};

export const assignStudentToClass = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { classId } = req.params;
    const { studentId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      res.status(400).json({
        success: false,
        message: "Invalid class ID",
        data: null,
      });
      return;
    }

    if (!studentId) {
      res.status(400).json({
        success: false,
        message: "Please provide studentId",
        data: null,
      });
      return;
    }

    const student = await User.findOne({ _id: studentId, role: "student" });

    if (!student) {
      res.status(400).json({
        success: false,
        message: "Student not found or user is not a student",
        data: null,
      });
      return;
    }

    const classDoc = await Class.findByIdAndUpdate(
      classId,
      { $addToSet: { students: studentId } },
      { new: true }
    )
      .populate("teacher", "name email")
      .populate("students", "name email country studentId timezone");

    if (!classDoc) {
      res.status(404).json({
        success: false,
        message: "Class not found",
        data: null,
      });
      return;
    }

    await createUserNotification({
      userId: studentId,
      title: "Class Enrollment",
      message: `You have been enrolled in ${classDoc.title}`,
      type: "class",
    });

    const classForSync = await Class.findById(classId);
    if (classForSync) {
      await syncSlotsFromClass(classForSync);
    }

    res.status(200).json({
      success: true,
      message: "Student assigned to class successfully",
      data: classDoc,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to assign student to class",
      data: null,
    });
  }
};

export const removeStudentFromClass = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { classId, studentId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(classId) ||
      !mongoose.Types.ObjectId.isValid(studentId)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid class or student ID",
        data: null,
      });
      return;
    }

    const classDoc = await Class.findByIdAndUpdate(
      classId,
      { $pull: { students: studentId } },
      { new: true }
    )
      .populate("teacher", "name email")
      .populate("students", "name email country studentId timezone");

    if (!classDoc) {
      res.status(404).json({
        success: false,
        message: "Class not found",
        data: null,
      });
      return;
    }

    const classForSync = await Class.findById(classId);
    if (classForSync) {
      await syncSlotsFromClass(classForSync);
    }

    res.status(200).json({
      success: true,
      message: "Student removed from class successfully",
      data: classDoc,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to remove student from class",
      data: null,
    });
  }
};

import type { Types } from "mongoose";
import { Class } from "../models/Class";
import { User, type UserRole } from "../models/User";

export interface SearchResultItem {
  id: string;
  type: "student" | "teacher" | "class";
  title: string;
  subtitle?: string;
  path: string;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function searchAdmin(query: string): Promise<SearchResultItem[]> {
  const pattern = new RegExp(escapeRegex(query), "i");
  const results: SearchResultItem[] = [];

  const users = await User.find({
    isActive: true,
    role: { $in: ["student", "teacher"] },
    $or: [{ name: pattern }, { email: pattern }, { studentId: pattern }],
  })
    .select("name email role studentId")
    .limit(8)
    .lean();

  for (const user of users) {
    results.push({
      id: user._id.toString(),
      type: user.role === "teacher" ? "teacher" : "student",
      title: user.name,
      subtitle: user.studentId
        ? `${user.studentId} · ${user.email}`
        : user.email,
      path:
        user.role === "teacher"
          ? `/admin/users?role=teacher&q=${encodeURIComponent(user.name)}`
          : `/admin/users?role=student&q=${encodeURIComponent(user.name)}`,
    });
  }

  const classes = await Class.find({
    isActive: true,
    title: pattern,
  })
    .populate("teacher", "name")
    .select("title teacher")
    .limit(8)
    .lean();

  for (const cls of classes) {
    const teacher =
      cls.teacher && typeof cls.teacher === "object" && "name" in cls.teacher
        ? String((cls.teacher as { name: string }).name)
        : "Teacher";
    results.push({
      id: cls._id.toString(),
      type: "class",
      title: cls.title,
      subtitle: teacher,
      path: `/admin/classes/${cls._id.toString()}`,
    });
  }

  return results.slice(0, 12);
}

async function searchTeacher(
  teacherId: Types.ObjectId,
  query: string
): Promise<SearchResultItem[]> {
  const pattern = new RegExp(escapeRegex(query), "i");
  const classes = await Class.find({ teacher: teacherId, isActive: true })
    .select("title students")
    .lean();

  const studentIds = [
    ...new Set(classes.flatMap((c) => c.students.map((id) => id.toString()))),
  ];

  const results: SearchResultItem[] = [];

  const students = await User.find({
    _id: { $in: studentIds },
    $or: [{ name: pattern }, { studentId: pattern }, { email: pattern }],
  })
    .select("name email studentId")
    .limit(8)
    .lean();

  for (const student of students) {
    results.push({
      id: student._id.toString(),
      type: "student",
      title: student.name,
      subtitle: student.studentId ?? student.email,
      path: "/teacher/students",
    });
  }

  for (const cls of classes) {
    if (pattern.test(cls.title)) {
      results.push({
        id: cls._id.toString(),
        type: "class",
        title: cls.title,
        subtitle: "Your class",
        path: `/teacher/classes/${cls._id.toString()}`,
      });
    }
  }

  return results.slice(0, 12);
}

async function searchStudent(
  studentId: Types.ObjectId,
  query: string
): Promise<SearchResultItem[]> {
  const pattern = new RegExp(escapeRegex(query), "i");
  const classes = await Class.find({
    students: studentId,
    isActive: true,
    title: pattern,
  })
    .populate("teacher", "name")
    .select("title teacher")
    .limit(8)
    .lean();

  return classes.map((cls) => {
    const teacher =
      cls.teacher && typeof cls.teacher === "object" && "name" in cls.teacher
        ? String((cls.teacher as { name: string }).name)
        : undefined;
    return {
      id: cls._id.toString(),
      type: "class" as const,
      title: cls.title,
      subtitle: teacher,
      path: `/student/classes/${cls._id.toString()}`,
    };
  });
}

export async function globalSearch(
  userId: Types.ObjectId,
  role: UserRole,
  query: string
): Promise<SearchResultItem[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  switch (role) {
    case "admin":
      return searchAdmin(trimmed);
    case "teacher":
      return searchTeacher(userId, trimmed);
    case "student":
      return searchStudent(userId, trimmed);
    default:
      return [];
  }
}

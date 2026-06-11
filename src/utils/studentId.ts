import { User } from "../models/User";

export async function generateStudentId(): Promise<string> {
  const count = await User.countDocuments({ role: "student", studentId: { $exists: true, $ne: null } });
  const next = count + 1;
  return `ABY-${String(next).padStart(3, "0")}`;
}

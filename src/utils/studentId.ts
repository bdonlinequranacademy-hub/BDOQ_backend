import { User } from "../models/User";

export async function generateStudentId(): Promise<string> {
  // Find the highest existing studentId that matches the ABY-XXX pattern
  const lastUser = await User.findOne({ studentId: { $regex: /^ABY-\d+$/ } })
    .sort({ studentId: -1 })
    .select("studentId")
    .exec();

  if (lastUser && lastUser.studentId) {
    const match = lastUser.studentId.match(/^ABY-(\d+)$/);
    if (match) {
      const next = parseInt(match[1], 10) + 1;
      return `ABY-${String(next).padStart(3, "0")}`;
    }
  }

  // Fallback if no matching ID is found
  return "ABY-001";
}

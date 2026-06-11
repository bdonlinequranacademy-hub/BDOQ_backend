import { User } from "../models/User";
import { generateStudentId } from "../utils/studentId";

/** Legacy parent accounts are unified into student (guardian + learner one portal). */
export async function migrateParentAccountsToStudent(): Promise<number> {
  const parents = await User.find({ role: "parent" });

  for (const user of parents) {
    if (!user.studentId) {
      user.studentId = await generateStudentId();
    }
    user.role = "student";
    await user.save();
  }

  if (parents.length > 0) {
    console.log(
      `[roles] Migrated ${parents.length} legacy parent account(s) to student.`
    );
  }

  return parents.length;
}

/** Teachers/admins must not store studentId (null breaks sparse unique index). */
export async function unsetStudentIdForNonStudents(): Promise<number> {
  const result = await User.updateMany(
    { role: { $ne: "student" }, studentId: { $exists: true } },
    { $unset: { studentId: "" } }
  );

  if (result.modifiedCount > 0) {
    console.log(
      `[roles] Removed studentId from ${result.modifiedCount} non-student account(s).`
    );
  }

  return result.modifiedCount;
}

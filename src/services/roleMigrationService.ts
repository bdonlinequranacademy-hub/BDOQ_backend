import { User } from "../models/User";
import { generateStudentId } from "../utils/studentId";

/**
 * One-time cleanup: legacy parent accounts → student.
 * Uses native collection API so it still works after "parent" was removed from the role enum.
 */
export async function migrateParentAccountsToStudent(): Promise<number> {
  const parents = await User.collection
    .find({ role: "parent" })
    .project({ _id: 1, studentId: 1 })
    .toArray();

  for (const doc of parents) {
    const studentId =
      typeof doc.studentId === "string" && doc.studentId.trim()
        ? doc.studentId
        : await generateStudentId();

    await User.collection.updateOne(
      { _id: doc._id },
      {
        $set: { role: "student", studentId },
        $unset: { children: "" },
      }
    );
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

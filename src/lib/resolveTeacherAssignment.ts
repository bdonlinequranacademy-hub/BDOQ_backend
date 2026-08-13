import mongoose from "mongoose";
import { TeacherProfile } from "../models/TeacherProfile";
import { User } from "../models/User";

export async function resolveTeacherAssignment(
  slugOrId: string
): Promise<{ slug: string; name: string } | { error: string }> {
  const key = slugOrId.trim();
  if (!key) return { error: "Teacher is required." };

  const bySlug = await TeacherProfile.findOne({ slug: key });
  if (bySlug) {
    return { slug: bySlug.slug, name: bySlug.name };
  }

  if (!mongoose.Types.ObjectId.isValid(key)) {
    return { error: "Selected teacher was not found." };
  }

  const byLinkedUser = await TeacherProfile.findOne({ linkedUserId: key });
  if (byLinkedUser) {
    return { slug: byLinkedUser.slug, name: byLinkedUser.name };
  }

  const user = await User.findOne({
    _id: key,
    role: "teacher",
    isActive: { $ne: false },
  }).select("name");

  if (!user) {
    return { error: "Selected teacher was not found." };
  }

  return { slug: String(user._id), name: user.name };
}

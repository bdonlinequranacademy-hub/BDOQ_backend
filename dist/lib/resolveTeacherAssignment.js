"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTeacherAssignment = resolveTeacherAssignment;
const mongoose_1 = __importDefault(require("mongoose"));
const TeacherProfile_1 = require("../models/TeacherProfile");
const User_1 = require("../models/User");
async function resolveTeacherAssignment(slugOrId) {
    const key = slugOrId.trim();
    if (!key)
        return { error: "Teacher is required." };
    const bySlug = await TeacherProfile_1.TeacherProfile.findOne({ slug: key });
    if (bySlug) {
        return { slug: bySlug.slug, name: bySlug.name };
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(key)) {
        return { error: "Selected teacher was not found." };
    }
    const byLinkedUser = await TeacherProfile_1.TeacherProfile.findOne({ linkedUserId: key });
    if (byLinkedUser) {
        return { slug: byLinkedUser.slug, name: byLinkedUser.name };
    }
    const user = await User_1.User.findOne({
        _id: key,
        role: "teacher",
        isActive: { $ne: false },
    }).select("name");
    if (!user) {
        return { error: "Selected teacher was not found." };
    }
    return { slug: String(user._id), name: user.name };
}

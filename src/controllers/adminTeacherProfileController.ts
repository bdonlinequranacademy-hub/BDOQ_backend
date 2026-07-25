import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  TeacherProfile,
  type ITeacherProfile,
  type TeacherProfileGender,
} from "../models/TeacherProfile";

const TEACHER_GENDERS = ["male", "female"] as const;

const formatTeacherProfile = (doc: ITeacherProfile) => ({
  id: doc._id.toString(),
  slug: doc.slug,
  name: doc.name,
  role: doc.role,
  bio: doc.bio,
  about: doc.about,
  gender: doc.gender,
  country: doc.country,
  location: doc.location,
  address: doc.address,
  dateOfBirth: doc.dateOfBirth,
  age: doc.age,
  avatarUrl: doc.avatarUrl,
  featured: doc.featured,
  showOnWebsite: doc.showOnWebsite,
  sortOrder: doc.sortOrder,
  qualifications: doc.qualifications,
  skills: doc.skills,
  experience: doc.experience,
  languages: doc.languages,
  courseSlugs: doc.courseSlugs,
  linkedUserId: doc.linkedUserId?.toString(),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

function buildSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return base || `teacher-${Date.now()}`;
}

function isValidGender(value: string): value is TeacherProfileGender {
  return TEACHER_GENDERS.includes(value as TeacherProfileGender);
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

function parseOptionalString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return undefined;
}

export const adminGetTeacherProfiles = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const docs = await TeacherProfile.find().sort({ sortOrder: 1, createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Teacher profiles fetched successfully",
      data: docs.map((doc) => formatTeacherProfile(doc)),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch teacher profiles",
      data: null,
    });
  }
};

export const adminGetTeacherProfileById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid teacher profile id",
        data: null,
      });
      return;
    }

    const doc = await TeacherProfile.findById(id);
    if (!doc) {
      res.status(404).json({
        success: false,
        message: "Teacher profile not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Teacher profile fetched successfully",
      data: formatTeacherProfile(doc),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch teacher profile",
      data: null,
    });
  }
};

export const adminCreateTeacherProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const {
      slug,
      name,
      role,
      bio,
      gender,
      about,
      country,
      location,
      address,
      dateOfBirth,
      age,
      avatarUrl,
      featured,
      showOnWebsite,
      sortOrder,
      qualifications,
      skills,
      experience,
      languages,
      courseSlugs,
      linkedUserId,
    } = body;

    if (typeof name !== "string" || !name.trim()) {
      res.status(400).json({
        success: false,
        message: "Teacher name is required",
        data: null,
      });
      return;
    }

    if (typeof role !== "string" || !role.trim()) {
      res.status(400).json({
        success: false,
        message: "Teacher role is required",
        data: null,
      });
      return;
    }

    if (typeof bio !== "string" || !bio.trim()) {
      res.status(400).json({
        success: false,
        message: "Teacher bio is required",
        data: null,
      });
      return;
    }

    if (typeof gender !== "string" || !isValidGender(gender)) {
      res.status(400).json({
        success: false,
        message: "Valid gender is required (male or female)",
        data: null,
      });
      return;
    }

    if (
      linkedUserId !== undefined &&
      linkedUserId !== null &&
      linkedUserId !== "" &&
      (typeof linkedUserId !== "string" ||
        !mongoose.Types.ObjectId.isValid(linkedUserId))
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid linked user id",
        data: null,
      });
      return;
    }

    const resolvedSlug =
      typeof slug === "string" && slug.trim()
        ? slug.trim().toLowerCase()
        : buildSlug(name);

    const doc = await TeacherProfile.create({
      slug: resolvedSlug,
      name: name.trim(),
      role: role.trim(),
      bio: bio.trim(),
      gender,
      about: parseOptionalString(about),
      country: parseOptionalString(country),
      location: parseOptionalString(location),
      address: parseOptionalString(address),
      dateOfBirth: parseOptionalString(dateOfBirth),
      age: parseOptionalString(age),
      avatarUrl: parseOptionalString(avatarUrl),
      featured: featured === true,
      showOnWebsite: showOnWebsite !== false,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      qualifications: parseStringArray(qualifications),
      skills: parseStringArray(skills),
      experience: parseOptionalString(experience),
      languages: parseStringArray(languages),
      courseSlugs: parseStringArray(courseSlugs),
      linkedUserId:
        typeof linkedUserId === "string" && linkedUserId.trim()
          ? linkedUserId.trim()
          : undefined,
    });

    res.status(201).json({
      success: true,
      message: "Teacher profile created successfully",
      data: formatTeacherProfile(doc),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("duplicate")
        ? "A teacher profile with this slug already exists"
        : "Failed to create teacher profile";
    res.status(500).json({ success: false, message, data: null });
  }
};

export const adminUpdateTeacherProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid teacher profile id",
        data: null,
      });
      return;
    }

    const doc = await TeacherProfile.findById(id);
    if (!doc) {
      res.status(404).json({
        success: false,
        message: "Teacher profile not found",
        data: null,
      });
      return;
    }

    const body = req.body as Record<string, unknown>;

    if (typeof body.slug === "string" && body.slug.trim()) {
      doc.slug = body.slug.trim().toLowerCase();
    }
    if (typeof body.name === "string" && body.name.trim()) {
      doc.name = body.name.trim();
    }
    if (typeof body.role === "string" && body.role.trim()) {
      doc.role = body.role.trim();
    }
    if (typeof body.bio === "string" && body.bio.trim()) {
      doc.bio = body.bio.trim();
    }
    if (typeof body.gender === "string") {
      if (!isValidGender(body.gender)) {
        res.status(400).json({
          success: false,
          message: "Valid gender is required (male or female)",
          data: null,
        });
        return;
      }
      doc.gender = body.gender;
    }
    if (body.about !== undefined) {
      doc.about = parseOptionalString(body.about);
    }
    if (body.country !== undefined) {
      doc.country = parseOptionalString(body.country);
    }
    if (body.location !== undefined) {
      doc.location = parseOptionalString(body.location);
    }
    if (body.address !== undefined) {
      doc.address = parseOptionalString(body.address);
    }
    if (body.dateOfBirth !== undefined) {
      doc.dateOfBirth = parseOptionalString(body.dateOfBirth);
    }
    if (body.age !== undefined) {
      doc.age = parseOptionalString(body.age);
    }
    if (body.avatarUrl !== undefined) {
      doc.avatarUrl = parseOptionalString(body.avatarUrl);
    }
    if (typeof body.featured === "boolean") {
      doc.featured = body.featured;
    }
    if (typeof body.showOnWebsite === "boolean") {
      doc.showOnWebsite = body.showOnWebsite;
    }
    if (typeof body.sortOrder === "number") {
      doc.sortOrder = body.sortOrder;
    }
    if (body.qualifications !== undefined) {
      doc.qualifications = parseStringArray(body.qualifications);
    }
    if (body.skills !== undefined) {
      doc.skills = parseStringArray(body.skills);
    }
    if (body.experience !== undefined) {
      doc.experience = parseOptionalString(body.experience);
    }
    if (body.languages !== undefined) {
      doc.languages = parseStringArray(body.languages);
    }
    if (body.courseSlugs !== undefined) {
      doc.courseSlugs = parseStringArray(body.courseSlugs);
    }
    if (body.linkedUserId !== undefined) {
      if (body.linkedUserId === null || body.linkedUserId === "") {
        doc.linkedUserId = undefined;
      } else if (
        typeof body.linkedUserId === "string" &&
        mongoose.Types.ObjectId.isValid(body.linkedUserId)
      ) {
        doc.linkedUserId = new mongoose.Types.ObjectId(body.linkedUserId);
      } else {
        res.status(400).json({
          success: false,
          message: "Invalid linked user id",
          data: null,
        });
        return;
      }
    }

    await doc.save();

    res.status(200).json({
      success: true,
      message: "Teacher profile updated successfully",
      data: formatTeacherProfile(doc),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("duplicate")
        ? "A teacher profile with this slug already exists"
        : "Failed to update teacher profile";
    res.status(500).json({ success: false, message, data: null });
  }
};

export const adminDeleteTeacherProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid teacher profile id",
        data: null,
      });
      return;
    }

    const doc = await TeacherProfile.findByIdAndDelete(id);
    if (!doc) {
      res.status(404).json({
        success: false,
        message: "Teacher profile not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Teacher profile deleted successfully",
      data: null,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to delete teacher profile",
      data: null,
    });
  }
};

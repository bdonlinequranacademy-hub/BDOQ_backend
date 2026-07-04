import { ClassLog } from "../models/ClassLog";
import { Progress } from "../models/Progress";
import { TeacherProfile, type ITeacherProfile } from "../models/TeacherProfile";
import { User } from "../models/User";

const ACADEMY_FOUNDED_YEAR = 2019;
const AYAH_PER_JUZ = 200;

export interface PublicTeacherView {
  id: string;
  slug: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  gender: "male" | "female";
  country?: string;
  featured?: boolean;
  about?: string;
  dateOfBirth?: string;
  age?: string;
  address?: string;
  location?: string;
  qualifications?: string[];
  skills?: string[];
  experience?: string;
  languages?: string[];
  courseSlugs?: string[];
}

export interface PublicStatsView {
  totalTeachingHours: number;
  yearsExperience: number;
  totalTeachers: number;
  totalStudents: number;
  featuredTeachers: number;
}

export interface PublicProgressHighlight {
  label: string;
  percent: number;
}

function mapTeacherProfile(
  doc: ITeacherProfile | (ITeacherProfile & { _id: { toString(): string } })
): PublicTeacherView {
  return {
    id: String(doc._id),
    slug: doc.slug,
    name: doc.name,
    role: doc.role,
    bio: doc.bio,
    image: doc.avatarUrl?.trim() ?? "",
    gender: doc.gender,
    country: doc.country || undefined,
    featured: doc.featured,
    about: doc.about || undefined,
    dateOfBirth: doc.dateOfBirth || undefined,
    age: doc.age || undefined,
    address: doc.address || undefined,
    location: doc.location || undefined,
    qualifications: doc.qualifications.length > 0 ? doc.qualifications : undefined,
    skills: doc.skills.length > 0 ? doc.skills : undefined,
    experience: doc.experience || undefined,
    languages: doc.languages.length > 0 ? doc.languages : undefined,
    courseSlugs: doc.courseSlugs.length > 0 ? doc.courseSlugs : undefined,
  };
}

function formatUnitLabel(unitId: string | null | undefined, index: number): string {
  if (!unitId) return `Juz ${index + 1}`;
  if (/juz/i.test(unitId) || /^jz-/i.test(unitId)) {
    const num = unitId.replace(/\D/g, "");
    return num ? `Juz ${num}` : `Juz ${index + 1}`;
  }
  if (/hifz/i.test(unitId)) return `Hifz ${index + 1}`;
  return `Unit ${index + 1}`;
}

export async function listPublicTeachers(filters?: {
  gender?: "male" | "female";
  featured?: boolean;
}): Promise<PublicTeacherView[]> {
  const query: Record<string, unknown> = { showOnWebsite: true };

  if (filters?.gender) {
    query.gender = filters.gender;
  }
  if (filters?.featured === true) {
    query.featured = true;
  }

  const docs = await TeacherProfile.find(query)
    .sort({ featured: -1, sortOrder: 1, name: 1 })
    .lean<ITeacherProfile[]>();

  return docs.map((doc) => mapTeacherProfile(doc as ITeacherProfile));
}

export async function getPublicTeacherBySlug(
  slug: string
): Promise<PublicTeacherView | null> {
  const doc = await TeacherProfile.findOne({
    slug: slug.toLowerCase(),
    showOnWebsite: true,
  }).lean<ITeacherProfile>();

  if (!doc) return null;
  return mapTeacherProfile(doc as ITeacherProfile);
}

export async function getPublicStats(): Promise<PublicStatsView> {
  const [
    totalStudents,
    portalTeachers,
    websiteTeachers,
    featuredTeachers,
    approvedMinutes,
  ] = await Promise.all([
    User.countDocuments({ role: "student", isActive: true }),
    User.countDocuments({ role: "teacher", isActive: true }),
    TeacherProfile.countDocuments({ showOnWebsite: true }),
    TeacherProfile.countDocuments({ showOnWebsite: true, featured: true }),
    ClassLog.aggregate<{ total: number }>([
      { $match: { status: "approved" } },
      { $group: { _id: null, total: { $sum: "$durationMinutes" } } },
    ]),
  ]);

  const minutes = approvedMinutes[0]?.total ?? 0;
  const totalTeachingHours = Math.max(0, Math.round(minutes / 60));
  const yearsExperience = Math.max(
    1,
    new Date().getFullYear() - ACADEMY_FOUNDED_YEAR
  );

  return {
    totalTeachingHours,
    yearsExperience,
    totalTeachers: websiteTeachers > 0 ? websiteTeachers : portalTeachers,
    totalStudents,
    featuredTeachers,
  };
}

export async function getPublicProgressHighlights(): Promise<{
  items: PublicProgressHighlight[];
  hasData: boolean;
}> {
  const grouped = await Progress.aggregate<{
    _id: string;
    avgScore: number;
    avgAyahs: number;
    count: number;
  }>([
    {
      $match: {
        $or: [
          { memorizedAyahs: { $gt: 0 } },
          { tajweedScore: { $gt: 0 } },
        ],
      },
    },
    {
      $group: {
        _id: { $ifNull: ["$curriculumUnit", "$curriculumProgram"] },
        avgScore: { $avg: "$tajweedScore" },
        avgAyahs: { $avg: "$memorizedAyahs" },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1, avgAyahs: -1 } },
    { $limit: 3 },
  ]);

  if (grouped.length === 0) {
    return { items: [], hasData: false };
  }

  const items = grouped.map((row, index) => {
    const fromAyahs = Math.round(((row.avgAyahs ?? 0) / AYAH_PER_JUZ) * 100);
    const fromScore = Math.round(row.avgScore ?? 0);
    const percent = Math.min(100, Math.max(fromScore, fromAyahs));

    return {
      label: formatUnitLabel(row._id, index),
      percent,
    };
  });

  return { items, hasData: true };
}

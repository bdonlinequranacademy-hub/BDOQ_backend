/**
 * Seeds public website teacher profiles (TeacherProfile collection).
 * Idempotent upsert by slug — safe to re-run.
 *
 * Usage: npx ts-node scripts/seed-public-teachers.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { TeacherProfile } from "../src/models/TeacherProfile";

dotenv.config();

interface ISeedTeacher {
  slug: string;
  name: string;
  role: string;
  bio: string;
  gender: "male" | "female";
  country?: string;
  featured?: boolean;
  sortOrder: number;
  location?: string;
  about?: string;
  dateOfBirth?: string;
  age?: string;
  address?: string;
  qualifications?: string[];
  skills?: string[];
  experience?: string;
  languages?: string[];
  courseSlugs?: string[];
}

const TEACHER_PROFILES: ISeedTeacher[] = [
  {
    slug: "hafez-mawlana-rahmatullah",
    name: "Hafez Mawlana Rahmatullah",
    role: "Senior Tajweed Teacher",
    bio: "Experienced Hafiz specializing in Tajweed and Quran recitation with a patient, step-by-step teaching approach.",
    gender: "male",
    country: "Bangladesh",
    featured: true,
    sortOrder: 1,
    location: "Gopalganj, Bangladesh",
    qualifications: ["Hafiz", "Tajweed Certification"],
    skills: [
      "Advanced Tajweed instruction",
      "One-to-one live classes",
      "Adult and young learner support",
    ],
    experience: "8+ years teaching Quran online and in-person",
    languages: ["Bengali", "Arabic", "Urdu"],
    courseSlugs: ["tajweed-male", "noorani-qaida"],
  },
  {
    slug: "mawlana-farid-ahmed",
    name: "Mawlana Farid Ahmed",
    role: "Quran Hifz Specialist",
    bio: "Dedicated teacher guiding students through complete Quran memorization with structured revision plans.",
    gender: "male",
    country: "Bangladesh",
    featured: true,
    sortOrder: 2,
    location: "Dhaka, Bangladesh",
    qualifications: ["Hafiz", "Islamic Studies"],
    skills: [
      "Full Quran memorization coaching",
      "Daily revision tracking",
      "Motivational student care",
    ],
    experience: "6+ years in Hifz supervision",
    languages: ["Bengali", "Arabic"],
    courseSlugs: ["quran-hifz-male"],
  },
  {
    slug: "ustadha-ayesha-khan",
    name: "Ustadha Ayesha Khan",
    role: "Female Quran Teacher",
    bio: "Certified female teacher for sisters and children with a gentle, encouraging classroom style.",
    gender: "female",
    country: "Bangladesh",
    featured: true,
    sortOrder: 3,
    location: "Dhaka, Bangladesh",
    qualifications: ["Hafiza", "Tajweed Certification"],
    skills: [
      "Teaching sisters and young girls",
      "Noorani Qaida for beginners",
      "Patient pronunciation correction",
    ],
    experience: "5+ years teaching female students online",
    languages: ["Bengali", "English", "Arabic"],
    courseSlugs: ["noorani-qaida", "tajweed-female"],
  },
  {
    slug: "mawlana-ibrahim-hassan",
    name: "Mawlana Ibrahim Hassan",
    role: "Islamic Studies Teacher",
    bio: "Scholar with experience teaching students across the Middle East and guiding non-Arabic speakers.",
    gender: "male",
    country: "Egypt",
    featured: true,
    sortOrder: 4,
    location: "Cairo, Egypt",
    qualifications: ["Alim", "Quran Teacher Certification"],
    skills: [
      "Tajweed for international students",
      "Arabic language support",
      "Structured lesson planning",
    ],
    experience: "10+ years teaching Quran and Islamic studies",
    languages: ["Arabic", "English", "Urdu"],
    courseSlugs: ["tajweed-male", "free-learning"],
  },
  {
    slug: "hafez-yusuf-ali",
    name: "Hafez Yusuf Ali",
    role: "Noorani Qaida Expert",
    bio: "Patient instructor for beginners and young learners starting their Quran journey from the alphabet.",
    gender: "male",
    country: "United Kingdom",
    featured: true,
    sortOrder: 5,
    location: "London, United Kingdom",
    qualifications: ["Hafiz", "Noorani Qaida Specialist"],
    skills: [
      "Children and beginner instruction",
      "Foundation Arabic reading",
      "Engaging online classroom methods",
    ],
    experience: "7+ years teaching beginners in the UK and online",
    languages: ["English", "Bengali", "Arabic"],
    courseSlugs: ["noorani-qaida", "free-learning"],
  },
  {
    slug: "mawlana-kamal-uddin",
    name: "Mawlana Kamal Uddin",
    role: "Tajweed Instructor",
    bio: "Specializes in advanced Tajweed rules and fluent recitation for dedicated learners.",
    gender: "male",
    country: "Bangladesh",
    sortOrder: 6,
    location: "Chittagong, Bangladesh",
    qualifications: ["Hafiz", "Advanced Tajweed"],
    skills: ["Makhraj and Sifaat training", "Recitation improvement"],
    experience: "5+ years",
    languages: ["Bengali", "Arabic"],
    courseSlugs: ["tajweed-male"],
  },
  {
    slug: "hafez-abdullah-chowdhury",
    name: "Hafez Abdullah Chowdhury",
    role: "Hifz Teacher",
    bio: "Guides students through structured Quran memorization programs with weekly progress reviews.",
    gender: "male",
    country: "Bangladesh",
    sortOrder: 7,
    location: "Sylhet, Bangladesh",
    qualifications: ["Hafiz"],
    skills: ["Hifz planning", "Revision schedules", "Student accountability"],
    experience: "4+ years",
    languages: ["Bengali", "Arabic"],
    courseSlugs: ["quran-hifz-male"],
  },
  {
    slug: "mawlana-tariq-islam",
    name: "Mawlana Tariq Islam",
    role: "Noorani Qaida Teacher",
    bio: "Experienced in teaching children and adult beginners with clear, step-by-step methods.",
    gender: "male",
    country: "UAE",
    sortOrder: 8,
    location: "Dubai, UAE",
    qualifications: ["Alim", "Quran Teacher"],
    skills: ["Beginner instruction", "Flexible scheduling for expat families"],
    experience: "6+ years",
    languages: ["English", "Arabic", "Urdu"],
    courseSlugs: ["noorani-qaida", "free-learning"],
  },
  {
    slug: "wardah-shehryar",
    name: "Alimah Wardah Shehryar",
    role: "Alimah | Quran Teacher",
    bio: "Dedicated Quran teacher committed to helping sisters and children learn with care, clarity, and Islamic adab.",
    about:
      "Assalamu Alaikum. I am Alimah Wardah Shehryar, a Quran teacher dedicated to helping students learn the Book of Allah with love, patience, and proper methodology. I believe every student deserves a teacher who listens, guides, and celebrates small victories on the path of Quran learning.",
    gender: "female",
    country: "Pakistan",
    sortOrder: 9,
    location: "Rawalpindi, Pakistan",
    dateOfBirth: "13 June 2002",
    age: "23 years old",
    address: "Khaiban-e-Sirsyed, Rawalpindi, Pakistan",
    qualifications: ["Alimah", "B.A."],
    skills: [
      "Teaching for children and female students",
      "Step-by-step method of teaching the Quran",
      "Caring and compassionate behavior towards students",
    ],
    experience: "2 years of experience in teaching Quran",
    languages: ["Urdu", "English"],
    courseSlugs: ["tajweed-female", "noorani-qaida", "quran-hifz-female"],
  },
  {
    slug: "ustadha-fatima-rahman",
    name: "Ustadha Fatima Rahman",
    role: "Tajweed Teacher (Female)",
    bio: "Certified in Tajweed with years of teaching experience for sisters across Bangladesh and abroad.",
    gender: "female",
    country: "Bangladesh",
    sortOrder: 10,
    location: "Dhaka, Bangladesh",
    qualifications: ["Hafiza", "Tajweed Certification"],
    skills: ["Female-only classes", "Tajweed rules", "Recitation correction"],
    experience: "5+ years",
    languages: ["Bengali", "English", "Arabic"],
    courseSlugs: ["tajweed-female"],
  },
  {
    slug: "ustadha-maryam-siddique",
    name: "Ustadha Maryam Siddique",
    role: "Quran Teacher for Children",
    bio: "Patient and caring instructor for young girls and children beginning their Quran education.",
    gender: "female",
    country: "Bangladesh",
    sortOrder: 11,
    location: "Gopalganj, Bangladesh",
    qualifications: ["Hafiza", "Child Education Training"],
    skills: [
      "Children's Quran classes",
      "Interactive learning",
      "Parent updates",
    ],
    experience: "4+ years",
    languages: ["Bengali", "Arabic"],
    courseSlugs: ["noorani-qaida", "tajweed-female"],
  },
  {
    slug: "ustadha-khadija-akter",
    name: "Ustadha Khadija Akter",
    role: "Hifz Teacher (Female)",
    bio: "Supports sisters in Quran memorization with personalized plans and consistent follow-up.",
    gender: "female",
    country: "Malaysia",
    sortOrder: 12,
    location: "Kuala Lumpur, Malaysia",
    qualifications: ["Hafiza"],
    skills: ["Female Hifz programs", "Revision coaching", "Progress tracking"],
    experience: "3+ years",
    languages: ["Bengali", "English", "Malay"],
    courseSlugs: ["quran-hifz-female"],
  },
  {
    slug: "ustadha-nusrat-jahan",
    name: "Ustadha Nusrat Jahan",
    role: "Islamic Studies Teacher",
    bio: "Teaches foundational Islamic knowledge alongside Quran reading for sisters and families.",
    gender: "female",
    country: "United Kingdom",
    sortOrder: 13,
    location: "Manchester, United Kingdom",
    qualifications: ["Alimah", "Islamic Studies"],
    skills: [
      "Islamic fundamentals",
      "Quran reading support",
      "Multilingual teaching",
    ],
    experience: "6+ years",
    languages: ["English", "Bengali", "Urdu"],
    courseSlugs: ["tajweed-female", "free-learning"],
  },
];

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is required");
    process.exit(1);
  }

  await mongoose.connect(uri);

  let upserted = 0;
  for (const profile of TEACHER_PROFILES) {
    await TeacherProfile.findOneAndUpdate(
      { slug: profile.slug },
      {
        $set: {
          ...profile,
          showOnWebsite: true,
          featured: profile.featured ?? false,
          qualifications: profile.qualifications ?? [],
          skills: profile.skills ?? [],
          languages: profile.languages ?? [],
          courseSlugs: profile.courseSlugs ?? [],
        },
      },
      { upsert: true, new: true }
    );
    upserted++;
  }

  console.log(`✓ Seeded ${upserted} public teacher profiles`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

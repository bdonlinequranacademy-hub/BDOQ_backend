/**
 * Seeds sample academy data (users, classes, homework, payments, blog, etc.)
 * for owner presentations. All seed records are tagged and safe to remove.
 *
 * Usage (from My-Academy):
 *   npm run seed:academy-demo
 *   ACADEMY_SEED_CLEAR=true npm run seed:academy-demo
 *   npm run seed:production   ← full deploy demo (academy + resources)
 *
 * Sample logins (password defaults to Sample1234! or SEED_PASSWORD env):
 *   seed.teacher1@seed.boq.academy
 *   seed.student1@seed.boq.academy  … seed.student8@…
 *   seed.parent1@seed.boq.academy   (linked to student1 & student2)
 */
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User, IUser } from "../src/models/User";
import { Class, ScheduleDay } from "../src/models/Class";
import { SessionSlot } from "../src/models/SessionSlot";
import { ClassLog } from "../src/models/ClassLog";
import { Homework } from "../src/models/Homework";
import { Attendance } from "../src/models/Attendance";
import { Progress } from "../src/models/Progress";
import { TrialBooking } from "../src/models/TrialBooking";
import { ContactMessage } from "../src/models/ContactMessage";
import { StudentRequest } from "../src/models/StudentRequest";
import { Notification } from "../src/models/Notification";
import { StudentBilling } from "../src/models/StudentBilling";
import { PaymentRecord } from "../src/models/PaymentRecord";
import { BlogPost, type BlogCategory } from "../src/models/BlogPost";
import { SessionJoin } from "../src/models/SessionJoin";
import { StudentAdmissionApplication } from "../src/models/StudentAdmissionApplication";
import { TeacherApplication } from "../src/models/TeacherApplication";
import { computePaidUntil } from "../src/services/paymentService";
import {
  ACADEMY_TIMEZONE,
  formatWeeklyTime,
  getSessionInstant,
  getSessionPhase,
  getTodayScheduleDay,
} from "../src/utils/scheduleUtils";

dotenv.config();

const SEED_DOMAIN = "seed.boq.academy";
const SEED_PAYMENT_REF = "SEED-";
const SEED_TRIAL_SOURCE = "academy-seed";
const SEED_BLOG_SLUG_PREFIX = "seed-";
const SEED_SCREENSHOT = {
  url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
  publicId: "demo/sample",
};

const DAY_NAMES: ScheduleDay[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function seedEmail(local: string): string {
  return `${local}@${SEED_DOMAIN}`;
}

function addDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function getAcademyDateString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ACADEMY_TIMEZONE }).format(now);
}

function dhakaNowMinutes(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ACADEMY_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function formatMinutesAsTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function dhakaTimeOffset(offsetMinutes: number): string {
  return formatMinutesAsTime(dhakaNowMinutes() + offsetMinutes);
}

async function clearSeedData(): Promise<void> {
  const seedUsers = await User.find({
    email: { $regex: `@${SEED_DOMAIN.replace(".", "\\.")}$` },
  }).select("_id role");
  const seedUserIds = seedUsers.map((u) => u._id);
  const seedTeacherIds = seedUsers.filter((u) => u.role === "teacher").map((u) => u._id);

  const seedClasses = await Class.find({
    teacher: { $in: seedTeacherIds },
  }).select("_id");
  const seedClassIds = seedClasses.map((c) => c._id);

  if (seedUserIds.length === 0 && seedClassIds.length === 0) {
    await TrialBooking.deleteMany({ source: SEED_TRIAL_SOURCE });
    await ContactMessage.deleteMany({
      email: { $regex: `@${SEED_DOMAIN.replace(".", "\\.")}$` },
    });
    await PaymentRecord.deleteMany({ reference: { $regex: `^${SEED_PAYMENT_REF}` } });
    await BlogPost.deleteMany({ slug: { $regex: `^${SEED_BLOG_SLUG_PREFIX}` } });
    await StudentAdmissionApplication.deleteMany({
      email: { $regex: `@${SEED_DOMAIN.replace(".", "\\.")}$` },
    });
    await TeacherApplication.deleteMany({
      email: { $regex: `@${SEED_DOMAIN.replace(".", "\\.")}$` },
    });
    return;
  }

  await PaymentRecord.deleteMany({
    $or: [
      { student: { $in: seedUserIds } },
      { reference: { $regex: `^${SEED_PAYMENT_REF}` } },
    ],
  });
  await StudentBilling.deleteMany({ student: { $in: seedUserIds } });
  await Notification.deleteMany({ user: { $in: seedUserIds } });
  await ClassLog.deleteMany({
    $or: [{ student: { $in: seedUserIds } }, { class: { $in: seedClassIds } }],
  });
  await Homework.deleteMany({ class: { $in: seedClassIds } });
  await Attendance.deleteMany({
    $or: [{ student: { $in: seedUserIds } }, { class: { $in: seedClassIds } }],
  });
  await Progress.deleteMany({
    $or: [{ student: { $in: seedUserIds } }, { class: { $in: seedClassIds } }],
  });
  const seedSlotIds = await SessionSlot.find({ class: { $in: seedClassIds } }).distinct(
    "_id"
  );
  await SessionJoin.deleteMany({ sessionSlot: { $in: seedSlotIds } });
  await SessionSlot.deleteMany({ class: { $in: seedClassIds } });
  await StudentRequest.deleteMany({ teacher: { $in: seedTeacherIds } });
  await Class.deleteMany({ _id: { $in: seedClassIds } });
  await TrialBooking.deleteMany({ source: SEED_TRIAL_SOURCE });
  await ContactMessage.deleteMany({
    email: { $regex: `@${SEED_DOMAIN.replace(".", "\\.")}$` },
  });
  await BlogPost.deleteMany({ slug: { $regex: `^${SEED_BLOG_SLUG_PREFIX}` } });
  await StudentAdmissionApplication.deleteMany({
    email: { $regex: `@${SEED_DOMAIN.replace(".", "\\.")}$` },
  });
  await TeacherApplication.deleteMany({
    email: { $regex: `@${SEED_DOMAIN.replace(".", "\\.")}$` },
  });
  await User.deleteMany({ _id: { $in: seedUserIds } });

  console.log("Cleared previous academy seed data.");
}

async function main(): Promise<void> {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set.");
    process.exit(1);
  }

  const clearFirst =
    process.env.ACADEMY_SEED_CLEAR === "true" ||
    process.env.ACADEMY_DEMO_CLEAR === "true";
  const seedPassword = process.env.SEED_PASSWORD?.trim() || "Sample1234!";
  const passwordHash = await bcrypt.hash(seedPassword, 10);

  await mongoose.connect(process.env.MONGO_URI);

  const existingSeed = await User.countDocuments({
    email: { $regex: `@${SEED_DOMAIN.replace(".", "\\.")}$` },
  });

  if (existingSeed > 0 && !clearFirst) {
    console.log(
      `Seed data already exists (${existingSeed} users). Run with ACADEMY_SEED_CLEAR=true to replace.`
    );
    await mongoose.disconnect();
    return;
  }

  if (clearFirst) {
    await clearSeedData();
  }

  const admin = await User.findOne({
    role: { $in: ["admin", "super_admin"] },
    isActive: true,
  });

  const today = startOfDay(new Date());

  const teacherDefs = [
    {
      local: "seed.teacher1",
      name: "Mst. Fatema Begum",
      gender: "female" as const,
      country: "Bangladesh",
      timezone: "Asia/Dhaka",
    },
    {
      local: "seed.teacher2",
      name: "Md. Kamrul Hasan",
      gender: "male" as const,
      country: "Bangladesh",
      timezone: "Asia/Dhaka",
    },
  ];

  const studentDefs = [
    { local: "seed.student1", name: "Ayesha Rahman", country: "Bangladesh", timezone: "Asia/Dhaka", gender: "female" as const },
    { local: "seed.student2", name: "Omar Faruk", country: "Bangladesh", timezone: "Asia/Dhaka", gender: "male" as const },
    { local: "seed.student3", name: "Fatema Yasmin", country: "Bangladesh", timezone: "Asia/Dhaka", gender: "female" as const },
    { local: "seed.student4", name: "Yusuf Ahmed", country: "Bangladesh", timezone: "Asia/Dhaka", gender: "male" as const },
    { local: "seed.student5", name: "Maryam Sultana", country: "United Kingdom", timezone: "Europe/London", gender: "female" as const },
    { local: "seed.student6", name: "Ibrahim Hossain", country: "United States", timezone: "America/New_York", gender: "male" as const },
    { local: "seed.student7", name: "Khadija Akter", country: "Bangladesh", timezone: "Asia/Dhaka", gender: "female" as const },
    { local: "seed.student8", name: "Hamza Uddin", country: "Bangladesh", timezone: "Asia/Dhaka", gender: "male" as const },
  ];

  const teachers: IUser[] = [];
  for (const t of teacherDefs) {
    const doc = await User.create({
      name: t.name,
      email: seedEmail(t.local),
      password: passwordHash,
      role: "teacher",
      authProvider: "local",
      emailVerified: true,
      isActive: true,
      gender: t.gender,
      country: t.country,
      timezone: t.timezone,
      meetingLink: "https://meet.google.com/boq-class",
      bankName: "Dutch-Bangla Bank",
      bankAccount: "****7842",
      bKashNumber: "01712345678",
    });
    teachers.push(doc);
  }

  const students: IUser[] = [];
  for (let i = 0; i < studentDefs.length; i++) {
    const s = studentDefs[i];
    const doc = await User.create({
      name: s.name,
      email: seedEmail(s.local),
      password: passwordHash,
      role: "student",
      authProvider: "local",
      emailVerified: true,
      isActive: true,
      gender: s.gender,
      country: s.country,
      timezone: s.timezone,
      studentId: `SEED-${String(i + 1).padStart(3, "0")}`,
      curriculumAssignments: [
        { programId: "tajweed", unitId: "tj-foundation", topicId: "tj-noon-tanween", completed: false },
      ],
    });
    students.push(doc);
  }

  const classDefs = [
    {
      title: "Tajweed Foundations",
      teacher: teachers[0],
      studentIndexes: [0, 1, 2, 3],
      day: "Saturday" as ScheduleDay,
      time: "10:00",
      duration: 60,
      rate: 500,
    },
    {
      title: "Hifz Evening Programme",
      teacher: teachers[1],
      studentIndexes: [4, 5, 6, 7],
      day: "Monday" as ScheduleDay,
      time: "15:00",
      duration: 45,
      rate: 550,
    },
    {
      title: "Quran Recitation",
      teacher: teachers[0],
      studentIndexes: [4, 5],
      day: "Wednesday" as ScheduleDay,
      time: "18:30",
      duration: 60,
      rate: 500,
    },
  ];

  const classes: InstanceType<typeof Class>[] = [];
  const slots: {
    slot: InstanceType<typeof SessionSlot>;
    classDoc: InstanceType<typeof Class>;
    student: IUser;
    teacher: IUser;
    day: ScheduleDay;
    time: string;
  }[] = [];

  for (const def of classDefs) {
    const classStudents = def.studentIndexes.map((i) => students[i]._id);
    const classDoc = await Class.create({
      title: def.title,
      description: "Live Quran class with tajweed focus — BD Online Quran Academy.",
      teacher: def.teacher._id,
      students: classStudents,
      schedule: { day: def.day, time: def.time, duration: def.duration },
      meetingLink: "https://meet.google.com/boq-class",
      sessionRateBdt: def.rate,
      isActive: true,
    });
    classes.push(classDoc);

    for (const idx of def.studentIndexes) {
      const student = students[idx];
      const slot = await SessionSlot.create({
        class: classDoc._id,
        teacher: def.teacher._id,
        student: student._id,
        day: def.day,
        startTime: def.time,
        durationMinutes: def.duration,
        courseType: "Quran",
        isActive: true,
        sessionPhase: "upcoming",
      });
      slots.push({
        slot,
        classDoc,
        student,
        teacher: def.teacher,
        day: def.day,
        time: def.time,
      });
    }
  }

  const logReports = [
    "Student practiced Madd rules and recited Surah Al-Fatiha with improved elongation.",
    "Reviewed Ghunnah and Ikhfaa rules. Student recited verses 1–8 of Surah An-Nas.",
    "Worked on Qalqalah and heavy letters — good progress applying tajweed rules.",
    "Memorization review: Surah Al-Ikhlas. Student needs more practice on waqf rules.",
    "New memorization: 5 ayahs from Surah Al-Mulk with tajweed correction.",
  ];

  for (let i = 0; i < 5; i++) {
    const ctx = slots[i];
    const sessionDate = isoDate(addDays(today, i === 0 ? 0 : -(i + 1)));
    await ClassLog.create({
      sessionSlot: ctx.slot._id,
      class: ctx.classDoc._id,
      teacher: ctx.teacher._id,
      student: ctx.student._id,
      sessionDate,
      durationMinutes: ctx.slot.durationMinutes,
      courseType: "Quran",
      lessonReport: logReports[i],
      topicsCovered: ["Tajweed", "Recitation"],
      curriculumProgram: "tajweed",
      curriculumUnit: "tj-foundation",
      curriculumTopic: "tj-noon-tanween",
      status: i < 3 ? "pending" : "approved",
      approvedBy: i >= 3 && admin ? admin._id : undefined,
      approvedAt: i >= 3 ? addDays(today, -2) : undefined,
      earningsBdt: i >= 3 ? 500 : undefined,
      times: {
        academy: {
          time: formatWeeklyTime(ctx.day, ctx.time, ACADEMY_TIMEZONE),
          timezone: ACADEMY_TIMEZONE,
        },
        teacher: {
          time: formatWeeklyTime(ctx.day, ctx.time, ctx.teacher.timezone || ACADEMY_TIMEZONE),
          timezone: ctx.teacher.timezone || ACADEMY_TIMEZONE,
        },
        student: {
          time: formatWeeklyTime(ctx.day, ctx.time, ctx.student.timezone || "UTC"),
          timezone: ctx.student.timezone || "UTC",
        },
      },
    });
  }

  const hwClass = classes[0];
  const hwTeacher = teachers[0];
  const hwStudents = [students[0], students[1], students[2], students[3]];

  await Homework.create({
    title: "Practice Surah An-Nas with tajweed",
    description: "Recite verses 1–3 aloud and note any Ghunnah mistakes for teacher review.",
    class: hwClass._id,
    teacher: hwTeacher._id,
    dueDate: addDays(today, 5),
    curriculumProgram: "tajweed",
    curriculumUnit: "tj-foundation",
    curriculumTopic: "tj-noon-tanween",
    submissions: [
      {
        student: hwStudents[0]._id,
        submittedAt: addDays(today, -1),
        content: "Completed practice and shared notes in class chat.",
        status: "graded",
        grade: "A",
        feedback: "Excellent tajweed — keep practicing elongation on Madd.",
        reviewedAt: addDays(today, -1),
      },
      {
        student: hwStudents[1]._id,
        submittedAt: addDays(today, -2),
        content: "Submitted homework through the portal.",
        status: "pending_review",
      },
      {
        student: hwStudents[2]._id,
        submittedAt: addDays(today, -3),
        content: "Resubmitted after feedback.",
        status: "returned",
        reviewFeedback: "Please fix Madd length on ayah 2 and resubmit.",
        reviewedAt: addDays(today, -2),
      },
    ],
  });

  await Homework.create({
    title: "Memorize 5 ayahs — Surah Al-Mulk",
    description: "Memorize ayahs 1–5 with correct tajweed. Be ready to recite in the next class.",
    class: classes[1]._id,
    teacher: teachers[1]._id,
    dueDate: addDays(today, 7),
    curriculumProgram: "hifz",
    curriculumUnit: "hz-juz-amma",
    curriculumTopic: "hz-juz-amma-surah-al-mulk",
    submissions: [
      {
        student: students[4]._id,
        submittedAt: addDays(today, -1),
        content: "Memorized all 5 ayahs.",
        status: "graded",
        grade: "B+",
        feedback: "Good effort — review waqf at the end of ayah 4.",
        reviewedAt: today,
      },
    ],
  });

  for (const cls of classes) {
    for (const sid of cls.students) {
      for (let w = 0; w < 4; w++) {
        const date = startOfDay(addDays(today, -(w * 7 + 3)));
        const statuses: Array<"present" | "absent" | "late"> = ["present", "present", "late", "absent"];
        await Attendance.create({
          class: cls._id,
          student: sid,
          date,
          status: statuses[w % statuses.length],
          markedBy: cls.teacher,
        });
      }
    }
  }

  const progressData = [
    { surahs: ["Al-Fatiha", "An-Nas"], score: 88, ayahs: 12 },
    { surahs: ["Al-Fatiha", "Al-Ikhlas"], score: 76, ayahs: 8 },
    { surahs: ["Al-Fatiha"], score: 65, ayahs: 5 },
    { surahs: ["Al-Fatiha", "Al-Falaq"], score: 92, ayahs: 15 },
  ];

  for (let i = 0; i < 4; i++) {
    await Progress.create({
      student: students[i]._id,
      class: classes[0]._id,
      surahsCompleted: progressData[i].surahs,
      tajweedScore: progressData[i].score,
      memorizedAyahs: progressData[i].ayahs,
      curriculumProgram: "tajweed",
      curriculumUnit: "tj-foundation",
      curriculumTopic: "tj-noon-tanween",
      notes: "Steady progress in tajweed and memorization.",
      updatedBy: teachers[0]._id,
    });
  }

  await TrialBooking.create([
    {
      parentName: "Fatema Begum",
      email: "fatema.begum@example.com",
      whatsapp: "+880 1712 345 678",
      country: "Bangladesh",
      learnerType: "child",
      timeSlot: "evening",
      teacherPreference: "female",
      preferredDays: ["Monday", "Wednesday"],
      timezone: "Asia/Dhaka",
      source: SEED_TRIAL_SOURCE,
      courseSlug: "quran-for-kids",
      status: "new",
    },
    {
      parentName: "Md. Karim Uddin",
      email: "karim.uddin@example.com",
      whatsapp: "+880 1811 000 456",
      country: "Bangladesh",
      learnerType: "adult",
      timeSlot: "morning",
      teacherPreference: "any",
      preferredDays: ["Saturday", "Sunday"],
      timezone: "Asia/Dhaka",
      source: SEED_TRIAL_SOURCE,
      courseSlug: "tajweed",
      status: "new",
    },
  ]);

  await ContactMessage.create([
    {
      name: "Md. Shahidul Islam",
      email: seedEmail("contact1"),
      message:
        "Assalamu alaikum — I am looking for evening Quran classes for my two children (ages 8 and 10). Please share fees and schedule.",
      locale: "en",
      status: "new",
    },
    {
      name: "Salma Akter",
      email: seedEmail("contact2"),
      message:
        "We completed a trial class last week and would like to enroll. What is the monthly fee?",
      locale: "en",
      status: "new",
    },
  ]);

  await StudentRequest.create({
    teacher: teachers[0]._id,
    message:
      "I have availability for two more Hifz students on weekday evenings. Please assign from the waiting list.",
    preferredCourseType: "Hifz",
    status: "pending",
  });

  const blogAuthorId = admin?._id ?? teachers[0]._id;
  const blogPosts: Array<{
    slug: string;
    title: string;
    description: string;
    body: string;
    category: BlogCategory;
    tags: string[];
    author: { name: string; role: string };
    readMinutes: number;
    featured: boolean;
    status: "draft" | "published";
    pubDaysAgo: number;
    faqs?: { question: string; answer: string }[];
  }> = [
    {
      slug: `${SEED_BLOG_SLUG_PREFIX}starting-tajweed-with-children`,
      title: "Starting Tajweed with Children — 5 Practical Tips",
      description:
        "A simple tajweed guide for parents before home Quran learning begins — from BD Online Quran Academy experience.",
      body: `## Why tajweed first?

Without tajweed, incorrect recitation habits form early. Learning by listening from a qualified teacher is most effective.

## 5 tips

1. **10 minutes daily** — consistency beats long sessions.
2. **Listen carefully** — repeat after your teacher's recitation.
3. **Practice one rule at a time** — Madd, Ghunnah, etc.
4. **Encourage effort** — praise progress, not only corrections.
5. **Use portal homework** — teachers can review submitted work online.

## At BOQ Academy

Live classes, teacher feedback, and progress tracking — all in one place.`,
      category: "Quran & Tajweed",
      tags: ["tajweed", "children", "beginners"],
      author: { name: "Mst. Fatema Begum", role: "Teacher" },
      readMinutes: 5,
      featured: true,
      status: "published",
      pubDaysAgo: 3,
      faqs: [
        {
          question: "What age can we start?",
          answer: "Around 5–6 years is fine, but regular practice matters more than age.",
        },
      ],
    },
    {
      slug: `${SEED_BLOG_SLUG_PREFIX}home-quran-setup`,
      title: "Home Quran Learning: A Parent Checklist",
      description:
        "Environment, schedule, and device setup for online Quran classes — a short checklist.",
      body: `## Quiet space

A calm corner, phone on silent, headphones ready.

## Schedule

Same time every day — fit it into your child's routine. Set timezone correctly in the portal.

## Devices

- Stable internet
- Test Zoom or Google Meet before class
- Laptop or tablet works best

## Fees and enrollment

Submit payment proof in the portal — classes stay active after admin verification.`,
      category: "Parent Guides",
      tags: ["parents", "online-class", "study-setup"],
      author: { name: "Md. Kamrul Hasan", role: "Teacher" },
      readMinutes: 4,
      featured: false,
      status: "published",
      pubDaysAgo: 10,
    },
    {
      slug: `${SEED_BLOG_SLUG_PREFIX}hifz-study-routine`,
      title: "Hifz Study Routine for Students and Parents",
      description: "How many ayahs per day, revision habits, and staying aligned with your teacher.",
      body: `## New portion

**3–5 ayahs daily** — quality over quantity.

## Revision

Full surah review before Jumuah. At least 10 minutes of old revision every day.

## Teacher logs

After class, teachers log progress — parents can follow along in the student dashboard.

## Common mistake

Only new memorization without revision — this weakens retention.`,
      category: "Learning Tips",
      tags: ["hifz", "routine", "revision"],
      author: { name: "Md. Kamrul Hasan", role: "Teacher" },
      readMinutes: 6,
      featured: false,
      status: "published",
      pubDaysAgo: 18,
    },
    {
      slug: `${SEED_BLOG_SLUG_PREFIX}portal-payment-guide`,
      title: "Submitting Payment Proof in the Portal — Step by Step",
      description: "How to submit bKash, bank transfer, or Wise payments through the BOQ student portal.",
      body: `## Step 1

Student login → **Payments** menu.

## Step 2

Enter amount, date, method, and transaction reference.

## Step 3

Upload a screenshot — **required**. Transaction ID must be clearly visible.

## Step 4

After admin approval, **Paid until** updates automatically.

## Need help?

Contact admin through the portal messages page.`,
      category: "Platform & AI",
      tags: ["portal", "payment", "bkash"],
      author: { name: "BOQ Admin Team", role: "Academy" },
      readMinutes: 3,
      featured: false,
      status: "draft",
      pubDaysAgo: 7,
    },
    {
      slug: `${SEED_BLOG_SLUG_PREFIX}ramadan-quran-plan`,
      title: "Ramadan Quran Plan (draft)",
      description: "Family Quran routine for Ramadan — publishing soon.",
      body: `## Draft note

This post is under review before publishing. It will include Ramadan schedules and child-friendly plans.`,
      category: "Learning Tips",
      tags: ["ramadan", "draft"],
      author: { name: "Mst. Fatema Begum", role: "Teacher" },
      readMinutes: 2,
      featured: false,
      status: "draft",
      pubDaysAgo: 0,
    },
  ];

  for (const post of blogPosts) {
    await BlogPost.create({
      title: post.title,
      slug: post.slug,
      description: post.description,
      body: post.body,
      pubDate: addDays(today, -post.pubDaysAgo),
      category: post.category,
      tags: post.tags,
      author: post.author,
      readMinutes: post.readMinutes,
      featured: post.featured,
      status: post.status,
      faqs: post.faqs ?? [],
      createdBy: blogAuthorId,
    });
  }

  const billingDefs: Array<{
    student: IUser;
    monthlyFee: number;
    currency: "USD" | "GBP" | "BDT";
    paidUntilDays: number | null;
  }> = [
    { student: students[0], monthlyFee: 8500, currency: "BDT", paidUntilDays: 45 },
    { student: students[1], monthlyFee: 8500, currency: "BDT", paidUntilDays: 5 },
    { student: students[2], monthlyFee: 8500, currency: "BDT", paidUntilDays: -15 },
    { student: students[3], monthlyFee: 9000, currency: "BDT", paidUntilDays: -30 },
    { student: students[4], monthlyFee: 95, currency: "GBP", paidUntilDays: 20 },
    { student: students[5], monthlyFee: 120, currency: "USD", paidUntilDays: 20 },
    { student: students[6], monthlyFee: 8500, currency: "BDT", paidUntilDays: 10 },
    { student: students[7], monthlyFee: 8500, currency: "BDT", paidUntilDays: null },
  ];

  for (const b of billingDefs) {
    await StudentBilling.create({
      student: b.student._id,
      monthlyFee: b.monthlyFee,
      currency: b.currency,
      dueDayOfMonth: 5,
      paidUntil: b.paidUntilDays == null ? null : addDays(today, b.paidUntilDays),
      isActive: true,
    });
  }

  const adminId = admin?._id;
  let seedInvoiceSeq = 1;

  async function insertPayment(opts: {
    student: IUser;
    amount: number;
    currency: "USD" | "GBP" | "BDT";
    monthsCovered: number;
    method: "wise" | "zelle" | "bank_transfer" | "paypal";
    reference: string;
    status: "pending" | "approved" | "rejected";
    paymentDaysAgo: number;
    transactionFee?: number;
    note?: string;
    rejectionReason?: string;
  }): Promise<void> {
    const paymentDate = addDays(today, -opts.paymentDaysAgo);
    const paidUntilAfter =
      opts.status === "approved"
        ? computePaidUntil(addDays(today, -opts.paymentDaysAgo), opts.monthsCovered)
        : undefined;

    await PaymentRecord.create({
      student: opts.student._id,
      amount: opts.amount,
      currency: opts.currency,
      country: opts.student.country || "Unknown",
      paymentDate,
      monthsCovered: opts.monthsCovered,
      method: opts.method,
      reference: opts.reference,
      transactionFee: opts.transactionFee,
      netAmount:
        opts.transactionFee != null ? opts.amount - opts.transactionFee : undefined,
      note: opts.note,
      screenshotUrl: SEED_SCREENSHOT.url,
      screenshotPublicId: SEED_SCREENSHOT.publicId,
      status: opts.status,
      rejectionReason: opts.rejectionReason,
      reviewedBy: opts.status !== "pending" ? adminId : undefined,
      reviewedAt: opts.status !== "pending" ? addDays(today, -1) : undefined,
      paidUntilAfter,
      invoiceNumber: `${SEED_PAYMENT_REF}INV-${String(seedInvoiceSeq++).padStart(4, "0")}`,
    });
  }

  await insertPayment({
    student: students[0],
    amount: 8500,
    currency: "BDT",
    monthsCovered: 1,
    method: "bank_transfer",
    reference: `${SEED_PAYMENT_REF}BKASH-JAN-001`,
    status: "approved",
    paymentDaysAgo: 60,
    note: "January monthly fee via bKash",
  });

  await insertPayment({
    student: students[1],
    amount: 8500,
    currency: "BDT",
    monthsCovered: 1,
    method: "bank_transfer",
    reference: `${SEED_PAYMENT_REF}BANK-FEB-12`,
    status: "approved",
    paymentDaysAgo: 25,
    note: "Bank transfer — Dutch-Bangla Bank",
  });

  await insertPayment({
    student: students[4],
    amount: 95,
    currency: "GBP",
    monthsCovered: 1,
    method: "bank_transfer",
    reference: `${SEED_PAYMENT_REF}BT-GBP-8841`,
    status: "approved",
    paymentDaysAgo: 35,
    note: "Bank transfer from the UK",
  });

  await insertPayment({
    student: students[5],
    amount: 120,
    currency: "USD",
    monthsCovered: 1,
    method: "wise",
    reference: `${SEED_PAYMENT_REF}WISE-MAR-01`,
    status: "pending",
    paymentDaysAgo: 2,
    note: "March fee via Wise from the USA",
  });

  await insertPayment({
    student: students[6],
    amount: 17000,
    currency: "BDT",
    monthsCovered: 2,
    method: "bank_transfer",
    reference: `${SEED_PAYMENT_REF}BKASH-2MO-17K`,
    status: "pending",
    paymentDaysAgo: 1,
    note: "Two months prepaid — pending verification",
  });

  await insertPayment({
    student: students[2],
    amount: 8000,
    currency: "BDT",
    monthsCovered: 1,
    method: "bank_transfer",
    reference: `${SEED_PAYMENT_REF}BKASH-REJECT-01`,
    status: "rejected",
    paymentDaysAgo: 10,
    rejectionReason: "Transaction reference is not clearly visible in the screenshot.",
  });

  await insertPayment({
    student: students[6],
    amount: 8400,
    currency: "BDT",
    monthsCovered: 1,
    method: "bank_transfer",
    reference: `${SEED_PAYMENT_REF}BKASH-REJECT-02`,
    status: "rejected",
    paymentDaysAgo: 20,
    rejectionReason: "Amount paid does not match the monthly fee.",
  });

  const notificationSeeds = [
    {
      user: students[0]._id,
      title: "Payment approved",
      message: "Your payment SEED-BKASH-JAN-001 has been approved.",
      type: "payment" as const,
    },
    {
      user: students[5]._id,
      title: "Payment under review",
      message: "Your payment proof is being reviewed by admin.",
      type: "payment" as const,
    },
    {
      user: teachers[0]._id,
      title: "Class log approved",
      message: "Your recent class log has been approved.",
      type: "class" as const,
    },
    {
      user: students[1]._id,
      title: "New homework assigned",
      message: "Practice Surah An-Nas with tajweed — due soon.",
      type: "homework" as const,
    },
  ];

  for (const n of notificationSeeds) {
    await Notification.create({ ...n, isRead: false });
  }

  // —— Today's live-monitor demo (always on current academy day) ——
  const todayDay = getTodayScheduleDay();
  const sessionDate = getAcademyDateString();
  const todayClass = await Class.create({
    title: "Today's Tajweed Sessions",
    description: "One-to-one live classes scheduled for today — demo data for live monitor.",
    teacher: teachers[0]._id,
    students: [students[0]._id, students[1]._id, students[2]._id, students[3]._id],
    schedule: {
      day: todayDay,
      time: dhakaTimeOffset(-20),
      duration: 60,
    },
    meetingLink: "https://meet.google.com/boq-live-demo",
    sessionRateBdt: 500,
    isActive: true,
  });

  const todaySlotPlan = [
    {
      studentIdx: 0,
      teacherIdx: 0,
      offsetMin: -22,
      duration: 60,
      courseType: "Tajweed · Sisters",
      teacherJoined: true,
      studentJoined: false,
    },
    {
      studentIdx: 1,
      teacherIdx: 1,
      offsetMin: -18,
      duration: 60,
      courseType: "Noorani Qaida",
      teacherJoined: true,
      studentJoined: true,
    },
    {
      studentIdx: 3,
      teacherIdx: 1,
      offsetMin: 50,
      duration: 45,
      courseType: "Hifz Review",
      teacherJoined: false,
      studentJoined: false,
    },
    {
      studentIdx: 2,
      teacherIdx: 0,
      offsetMin: -95,
      duration: 45,
      courseType: "Tajweed · Sisters",
      teacherJoined: true,
      studentJoined: false,
    },
  ];

  const now = new Date();
  for (const plan of todaySlotPlan) {
    const student = students[plan.studentIdx];
    const teacher = teachers[plan.teacherIdx];
    const startTime = dhakaTimeOffset(plan.offsetMin);
    const startsAt = getSessionInstant(todayDay, startTime);
    const phase =
      startsAt != null
        ? getSessionPhase(startsAt, plan.duration, now)
        : ("upcoming" as const);

    const slot = await SessionSlot.create({
      class: todayClass._id,
      teacher: teacher._id,
      student: student._id,
      day: todayDay,
      startTime,
      durationMinutes: plan.duration,
      courseType: plan.courseType,
      isActive: phase !== "completed",
      repeatWeekly: false,
      sessionPhase: phase,
    });

    if (plan.teacherJoined) {
      await SessionJoin.create({
        sessionSlot: slot._id,
        sessionDate,
        user: teacher._id,
        role: "teacher",
        source: "meeting_link",
        joinedAt: startsAt ?? now,
      });
    }
    if (plan.studentJoined) {
      await SessionJoin.create({
        sessionSlot: slot._id,
        sessionDate,
        user: student._id,
        role: "student",
        source: "meeting_link",
        joinedAt: new Date((startsAt ?? now).getTime() + 3 * 60_000),
      });
    }
  }

  // Parent portal demo (linked children)
  const parent = await User.create({
    name: "Abdul Rahman",
    email: seedEmail("seed.parent1"),
    password: passwordHash,
    role: "parent",
    authProvider: "local",
    emailVerified: true,
    isActive: true,
    country: "Bangladesh",
    timezone: "Asia/Dhaka",
    whatsapp: "+8801712345678",
    children: [students[0]._id, students[1]._id],
  });

  await Notification.create({
    user: parent._id,
    title: "Upcoming class reminder",
    message: `${students[0].name}'s class "Today's Tajweed Sessions" starts soon.`,
    type: "class",
    isRead: false,
  });

  await StudentAdmissionApplication.create([
    {
      fullName: "Zainab Hossain",
      email: seedEmail("seed.admission1"),
      whatsapp: "+880 1812 555 010",
      locale: "en",
      status: "new",
      formData: {
        age: "9",
        gender: "female",
        country: "Bangladesh",
        programInterest: "tajweed",
        preferredTime: "Evening",
        guardianName: "Hossain Uddin",
      },
    },
    {
      fullName: "Ahmed Malik",
      email: seedEmail("seed.admission2"),
      whatsapp: "+44 7700 900123",
      locale: "en",
      status: "reviewing",
      formData: {
        age: "12",
        gender: "male",
        country: "United Kingdom",
        programInterest: "hifz",
        preferredTime: "Weekend morning",
        guardianName: "Malik Family",
      },
    },
  ]);

  await TeacherApplication.create([
    {
      fullName: "Mst. Ayesha Siddiqua",
      email: seedEmail("seed.teacherapp1"),
      phone: "+880 1911 222 333",
      locale: "bn",
      status: "new",
      formData: {
        gender: "female",
        experience: "5 years online tajweed teaching",
        subjects: ["tajweed", "quran-recitation"],
        availability: "Weekday evenings",
      },
      files: {
        cvUrl: SEED_SCREENSHOT.url,
        cvPublicId: SEED_SCREENSHOT.publicId,
      },
    },
    {
      fullName: "Md. Rafiqul Islam",
      email: seedEmail("seed.teacherapp2"),
      phone: "+880 1711 444 555",
      locale: "en",
      status: "reviewing",
      formData: {
        gender: "male",
        experience: "Hafiz, 3 years teaching children",
        subjects: ["hifz", "noorani-qaida"],
        availability: "Morning and afternoon",
      },
      files: {
        cvUrl: SEED_SCREENSHOT.url,
        cvPublicId: SEED_SCREENSHOT.publicId,
      },
    },
  ]);

  if (admin) {
    await Notification.create({
      user: admin._id,
      title: "Sample data ready",
      message: "Academy seed completed. Review Payments and Class Logs tabs.",
      type: "general",
      isRead: false,
    });
  }

  console.log("\n=== Academy seed complete ===\n");
  console.log("Created:");
  console.log(`  • ${teachers.length} teachers`);
  console.log(`  • ${students.length} students + 1 parent (${seedEmail("seed.parent1")})`);
  console.log(`  • ${classes.length + 1} classes (weekly + today's live demo on ${todayDay})`);
  console.log(`  • ${todaySlotPlan.length} today's session slots with join tracking (live monitor)`);
  console.log("  • 5 class logs (3 pending, 2 approved)");
  console.log("  • 2 homework assignments with submissions");
  console.log("  • Attendance, progress, trials, contacts, payments");
  console.log("  • 2 student admissions + 2 teacher applications");
  console.log(`  • ${blogPosts.length} blog posts (4 published, 1 draft)`);
  console.log("\nPassword (all seed accounts):", seedPassword);
  console.log("\nSample logins:");
  console.log(`  Teacher: ${seedEmail("seed.teacher1")}  (Mst. Fatema Begum)`);
  console.log(`  Teacher: ${seedEmail("seed.teacher2")}  (Md. Kamrul Hasan)`);
  console.log(`  Student: ${seedEmail("seed.student1")}  (Ayesha Rahman — fee current)`);
  console.log(`  Student: ${seedEmail("seed.student3")}  (Fatema Yasmin — overdue)`);
  console.log(`  Student: ${seedEmail("seed.student6")}  (Ibrahim Hossain — USA, pending payment)`);
  console.log(`  Parent:  ${seedEmail("seed.parent1")}  (children: student1 & student2)`);
  console.log("\nAdmin portal: Dashboard → Live Monitor / Payments / Class Logs / Blog");
  console.log("Public site: run npm run seed:resources for ebooks, audio & videos");
  console.log("\nTo reset seed data:");
  console.log("  npm run seed:production\n");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

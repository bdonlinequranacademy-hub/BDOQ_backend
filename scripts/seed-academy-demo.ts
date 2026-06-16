/**
 * Seeds a full academy demo (users, classes, homework, payments, etc.)
 * for owner presentations. All demo records are tagged and safe to remove.
 *
 * Usage (from myAcademy-backend):
 *   npm run seed:academy-demo
 *   ACADEMY_DEMO_CLEAR=true npm run seed:academy-demo
 *
 * Demo logins (password defaults to Demo1234! or DEMO_PASSWORD env):
 *   demo.teacher1@demo.albayaan.academy
 *   demo.student1@demo.albayaan.academy  … demo.student8@…
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
import { ConcernReport } from "../src/models/ConcernReport";
import { Notification } from "../src/models/Notification";
import { StudentBilling } from "../src/models/StudentBilling";
import { PaymentRecord } from "../src/models/PaymentRecord";
import { BlogPost, type BlogCategory } from "../src/models/BlogPost";
import { computePaidUntil } from "../src/services/paymentService";
import { ACADEMY_TIMEZONE, formatWeeklyTime } from "../src/utils/scheduleUtils";

dotenv.config();

const DEMO_DOMAIN = "demo.albayaan.academy";
const DEMO_CLASS_PREFIX = "[Demo] ";
const DEMO_PAYMENT_REF = "DEMO-";
const DEMO_TRIAL_SOURCE = "academy-demo-seed";
const DEMO_BLOG_SLUG_PREFIX = "demo-";
const DEMO_SCREENSHOT = {
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

function demoEmail(local: string): string {
  return `${local}@${DEMO_DOMAIN}`;
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

async function clearDemoData(): Promise<void> {
  const demoUsers = await User.find({
    email: { $regex: `@${DEMO_DOMAIN.replace(".", "\\.")}$` },
  }).select("_id role");
  const demoUserIds = demoUsers.map((u) => u._id);
  const demoTeacherIds = demoUsers.filter((u) => u.role === "teacher").map((u) => u._id);

  const demoClasses = await Class.find({
    title: { $regex: "^\\[Demo\\]" },
  }).select("_id");
  const demoClassIds = demoClasses.map((c) => c._id);

  if (demoUserIds.length === 0 && demoClassIds.length === 0) {
    await TrialBooking.deleteMany({ source: DEMO_TRIAL_SOURCE });
    await ContactMessage.deleteMany({
      email: { $regex: `@${DEMO_DOMAIN.replace(".", "\\.")}$` },
    });
    await PaymentRecord.deleteMany({ reference: { $regex: `^${DEMO_PAYMENT_REF}` } });
    await BlogPost.deleteMany({ slug: { $regex: `^${DEMO_BLOG_SLUG_PREFIX}` } });
    return;
  }

  await PaymentRecord.deleteMany({
    $or: [
      { student: { $in: demoUserIds } },
      { reference: { $regex: `^${DEMO_PAYMENT_REF}` } },
    ],
  });
  await StudentBilling.deleteMany({ student: { $in: demoUserIds } });
  await Notification.deleteMany({ user: { $in: demoUserIds } });
  await ClassLog.deleteMany({
    $or: [{ student: { $in: demoUserIds } }, { class: { $in: demoClassIds } }],
  });
  await Homework.deleteMany({ class: { $in: demoClassIds } });
  await Attendance.deleteMany({
    $or: [{ student: { $in: demoUserIds } }, { class: { $in: demoClassIds } }],
  });
  await Progress.deleteMany({
    $or: [{ student: { $in: demoUserIds } }, { class: { $in: demoClassIds } }],
  });
  await SessionSlot.deleteMany({ class: { $in: demoClassIds } });
  await StudentRequest.deleteMany({ teacher: { $in: demoTeacherIds } });
  await ConcernReport.deleteMany({ reporter: { $in: demoUserIds } });
  await Class.deleteMany({ _id: { $in: demoClassIds } });
  await TrialBooking.deleteMany({ source: DEMO_TRIAL_SOURCE });
  await ContactMessage.deleteMany({
    email: { $regex: `@${DEMO_DOMAIN.replace(".", "\\.")}$` },
  });
  await BlogPost.deleteMany({ slug: { $regex: `^${DEMO_BLOG_SLUG_PREFIX}` } });
  await User.deleteMany({ _id: { $in: demoUserIds } });

  console.log("Cleared previous academy demo data.");
}

async function main(): Promise<void> {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set.");
    process.exit(1);
  }

  const clearFirst = process.env.ACADEMY_DEMO_CLEAR === "true";
  const demoPassword = process.env.DEMO_PASSWORD?.trim() || "Demo1234!";
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  await mongoose.connect(process.env.MONGO_URI);

  const existingDemo = await User.countDocuments({
    email: { $regex: `@${DEMO_DOMAIN.replace(".", "\\.")}$` },
  });

  if (existingDemo > 0 && !clearFirst) {
    console.log(
      `Demo data already exists (${existingDemo} demo users). Run with ACADEMY_DEMO_CLEAR=true to replace.`
    );
    await mongoose.disconnect();
    return;
  }

  if (clearFirst) {
    await clearDemoData();
  }

  const admin = await User.findOne({
    role: { $in: ["admin", "super_admin"] },
    isActive: true,
  });

  const todayDay = DAY_NAMES[new Date().getDay()];
  const today = startOfDay(new Date());
  const todayStr = isoDate(today);

  const teacherDefs = [
    {
      local: "demo.teacher1",
      name: "Mst. Fatema Begum",
      gender: "female" as const,
      country: "Bangladesh",
      timezone: "Asia/Dhaka",
    },
    {
      local: "demo.teacher2",
      name: "Md. Kamrul Hasan",
      gender: "male" as const,
      country: "Bangladesh",
      timezone: "Asia/Dhaka",
    },
  ];

  const studentDefs = [
    { local: "demo.student1", name: "Ayesha Rahman", country: "Bangladesh", timezone: "Asia/Dhaka", gender: "female" as const },
    { local: "demo.student2", name: "Omar Faruk", country: "Bangladesh", timezone: "Asia/Dhaka", gender: "male" as const },
    { local: "demo.student3", name: "Fatema Yasmin", country: "Bangladesh", timezone: "Asia/Dhaka", gender: "female" as const },
    { local: "demo.student4", name: "Yusuf Ahmed", country: "Bangladesh", timezone: "Asia/Dhaka", gender: "male" as const },
    { local: "demo.student5", name: "Maryam Sultana", country: "United Kingdom", timezone: "Europe/London", gender: "female" as const },
    { local: "demo.student6", name: "Ibrahim Hossain", country: "United States", timezone: "America/New_York", gender: "male" as const },
    { local: "demo.student7", name: "Khadija Akter", country: "Bangladesh", timezone: "Asia/Dhaka", gender: "female" as const },
    { local: "demo.student8", name: "Hamza Uddin", country: "Bangladesh", timezone: "Asia/Dhaka", gender: "male" as const },
  ];

  const teachers: IUser[] = [];
  for (const t of teacherDefs) {
    const doc = await User.create({
      name: t.name,
      email: demoEmail(t.local),
      password: passwordHash,
      role: "teacher",
      authProvider: "local",
      emailVerified: true,
      isActive: true,
      gender: t.gender,
      country: t.country,
      timezone: t.timezone,
      meetingLink: "https://meet.google.com/demo-albayaan-class",
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
      email: demoEmail(s.local),
      password: passwordHash,
      role: "student",
      authProvider: "local",
      emailVerified: true,
      isActive: true,
      gender: s.gender,
      country: s.country,
      timezone: s.timezone,
      studentId: `DEMO-${String(i + 1).padStart(3, "0")}`,
      curriculumAssignments: [
        { programId: "quran-tajweed", unitId: "unit-1", completed: false },
      ],
    });
    students.push(doc);
  }

  const classDefs = [
    {
      title: `${DEMO_CLASS_PREFIX}Tajweed Bhitti`,
      teacher: teachers[0],
      studentIndexes: [0, 1, 2, 3],
      time: "10:00",
      duration: 60,
      rate: 500,
    },
    {
      title: `${DEMO_CLASS_PREFIX}Hifz Sanjivani`,
      teacher: teachers[1],
      studentIndexes: [4, 5, 6, 7],
      time: "15:00",
      duration: 45,
      rate: 550,
    },
    {
      title: `${DEMO_CLASS_PREFIX}Quran Tilawat`,
      teacher: teachers[0],
      studentIndexes: [4, 5],
      time: "18:30",
      duration: 60,
      rate: 500,
    },
  ];

  const classes: InstanceType<typeof Class>[] = [];
  const slots: { slot: InstanceType<typeof SessionSlot>; classDoc: InstanceType<typeof Class>; student: IUser; teacher: IUser; day: ScheduleDay; time: string }[] = [];

  for (const def of classDefs) {
    const classStudents = def.studentIndexes.map((i) => students[i]._id);
    const classDoc = await Class.create({
      title: def.title,
      description: "Al Bayaan Academy demo class — owner presentation er jonno.",
      teacher: def.teacher._id,
      students: classStudents,
      schedule: { day: todayDay, time: def.time, duration: def.duration },
      meetingLink: "https://meet.google.com/demo-albayaan-class",
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
        day: todayDay,
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
        day: todayDay,
        time: def.time,
      });
    }
  }

  const logReports = [
    "Shikkhartthi Madd er shiddhanto abhyas korechen. Surah Al-Fatiha bhalo uttoron kore recite korechen.",
    "Ghunnah ebong Ikhfaa er niyom review kora hoyeche. Surah An-Nas er 1–8 ayat tilawat korechen.",
    "Qalqalah ebong mot letter niye kaj — tajweed proyog e bhalo unnati.",
    "Hifz review: Surah Al-Ikhlas. Waqf niyome aro abhyas dorkar.",
    "Notun hifz: Surah Al-Mulk er 5 ayat — tajweed shudhi kore shikhano hoyeche.",
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
      curriculumProgram: "quran-tajweed",
      curriculumUnit: "unit-1",
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
    title: "Surah An-Nas — tajweed niye abhyas",
    description: "1–3 ayat shudhu mukhosto recite kore pathan. Ghunnah te vul thakle note kore janaben.",
    class: hwClass._id,
    teacher: hwTeacher._id,
    dueDate: addDays(today, 5),
    curriculumProgram: "quran-tajweed",
    curriculumUnit: "unit-1",
    submissions: [
      {
        student: hwStudents[0]._id,
        submittedAt: addDays(today, -1),
        content: "Abhyas shesh korechi. Class chat e note diyechi.",
        status: "graded",
        grade: "A",
        feedback: "Tajweed khub bhalo — Madd er dorkar moto lamba korte thakben.",
        reviewedAt: addDays(today, -1),
      },
      {
        student: hwStudents[1]._id,
        submittedAt: addDays(today, -2),
        content: "Portal theke homework submit korechi.",
        status: "pending_review",
      },
      {
        student: hwStudents[2]._id,
        submittedAt: addDays(today, -3),
        content: "Feedback er por abar pathiyechi.",
        status: "returned",
        reviewFeedback: "2 number ayate Madd er lamba thik kore abar pathan.",
        reviewedAt: addDays(today, -2),
      },
    ],
  });

  await Homework.create({
    title: "Surah Al-Mulk — 5 ayat hifz",
    description: "1–5 ayat shudhu tajweed mene hifz kore porer class e shunaben.",
    class: classes[1]._id,
    teacher: teachers[1]._id,
    dueDate: addDays(today, 7),
    curriculumProgram: "quran-hifz",
    submissions: [
      {
        student: students[4]._id,
        submittedAt: addDays(today, -1),
        content: "5 ayat hifz korechi.",
        status: "graded",
        grade: "B+",
        feedback: "Bhalo chesta — 4 number ayater sheshe waqf ta abar dekhben.",
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
      curriculumProgram: "quran-tajweed",
      curriculumUnit: "unit-1",
      notes: "Demo progress — tajweed ebong hifz unnati.",
      updatedBy: teachers[0]._id,
    });
  }

  await TrialBooking.create([
    {
      parentName: "Fatema Begum",
      email: "fatema.begum.demo@example.com",
      whatsapp: "+880 1712 345 678",
      country: "Bangladesh",
      learnerType: "child",
      timeSlot: "evening",
      teacherPreference: "female",
      preferredDays: ["Monday", "Wednesday"],
      timezone: "Asia/Dhaka",
      source: DEMO_TRIAL_SOURCE,
      courseSlug: "quran-for-kids",
      status: "new",
    },
    {
      parentName: "Md. Karim Uddin",
      email: "karim.uddin.demo@example.com",
      whatsapp: "+880 1811 000 456",
      country: "Bangladesh",
      learnerType: "adult",
      timeSlot: "morning",
      teacherPreference: "any",
      preferredDays: ["Saturday", "Sunday"],
      timezone: "Asia/Dhaka",
      source: DEMO_TRIAL_SOURCE,
      courseSlug: "tajweed",
      status: "new",
    },
  ]);

  await ContactMessage.create([
    {
      name: "Md. Shahidul Islam",
      email: demoEmail("demo.contact1"),
      message:
        "Assalamu alaikum — amar dui shishur jonno (8 ebong 10 bochhor) shondhar Quran class chai. Fees ebong schedule janaben.",
      locale: "bn",
      status: "new",
    },
    {
      name: "Salma Akter",
      email: demoEmail("demo.contact2"),
      message:
        "Goto soptahe trial class niyechilam. Enrollment korte chai — monthly fee koto hobe?",
      locale: "bn",
      status: "new",
    },
  ]);

  await StudentRequest.create({
    teacher: teachers[0]._id,
    message:
      "Amar weekday shondhar slot e aro dui jon Hifz shikkhartthi nite pari. Waiting list theke assign korle bhalo hoy.",
    preferredCourseType: "Hifz",
    status: "pending",
  });

  await ConcernReport.create({
    reporter: students[2]._id,
    reporterRole: "student",
    reporterName: students[2].name,
    category: "other",
    message: "Demo concern report — admin review workflow dekhanor jonno, asol kono ghotona na.",
    status: "new",
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
      slug: `${DEMO_BLOG_SLUG_PREFIX}tajweed-shuru-kibhabe`,
      title: "Bachchader jonno Tajweed shuru — 5 ta practical tips",
      description:
        "Ghore Quran shikhano shuru korar age obhibabokder jonno sohoj tajweed guide — Al Bayaan Academy er experience theke.",
      body: `## Keno tajweed age?

Tajweed chara recitation e vul habit gore othe. Choto bela theke shudhu shunte shunte shikha shobcheye effective.

## 5 ta tips

1. **Din e 10 minute** — beshi na, regular thakun.
2. **Mukhosto shonun** — Ustad er recitation bar bar shunben.
3. **Madd, Ghunnah alada kore** — ek ek rule abhyas korun.
4. **Positive feedback** — vul dhore shudhu shudhi na, bhalo kaj o bolun.
5. **Portal homework** — amader app e audio submit korle teacher review korte pare.

## Al Bayaan e ki hoy?

Live class, recorded feedback, ebong progress tracking — shob ek jaigay.`,
      category: "Quran & Tajweed",
      tags: ["tajweed", "bachcha", "bangladesh"],
      author: { name: "Mst. Fatema Begum", role: "Ustadha" },
      readMinutes: 5,
      featured: true,
      status: "published",
      pubDaysAgo: 3,
      faqs: [
        {
          question: "Koto bochhor theke shuru kora jay?",
          answer: "5–6 bochhor theke shuru kora jay, kintu regularity beshi guruttopurno.",
        },
      ],
    },
    {
      slug: `${DEMO_BLOG_SLUG_PREFIX}ghore-quran-shikkha-guide`,
      title: "Ghore Quran shikkha: obhibabokder checklist",
      description:
        "Online Quran class er jonno ghar e kemon environment, schedule ebong device setup lagbe — short checklist.",
      body: `## Ghar e quiet corner

Shanti purbo koner room, phone silent, headphone ready.

## Schedule

Proti din **ek ei time** — shishu der routine e fit korun. Bangladesh time ba abroad timezone — portal e timezone set korben.

## Device

- Stable internet
- Zoom/Google Meet test kore nin
- Laptop/tablet — phone o cholbe, kintu screen boro hole bhalo

## Payment ebong enrollment

Portal theke fee submit, screenshot upload — admin verify korar por class active thake.`,
      category: "Parent Guides",
      tags: ["parents", "online-class", "checklist"],
      author: { name: "Md. Kamrul Hasan", role: "Ustad" },
      readMinutes: 4,
      featured: false,
      status: "published",
      pubDaysAgo: 10,
    },
    {
      slug: `${DEMO_BLOG_SLUG_PREFIX}hifz-abhyas-routine`,
      title: "Hifz abhyas routine — shikkhartthi o obhibabok",
      description: "Din e koto ayat, revision kibhabe, ar teacher er shathe ki sync rakhben.",
      body: `## Notun portion

Din e **3–5 ayat** — quality beshi, quantity kom.

## Purono revision

Juma er age puro surah ekbar. Daily at least 10 minute old revision.

## Teacher log

Class er por teacher portal e log likhen — apni student dashboard e progress dekhte parben.

## Common mistake

Shudhu notun portion, revision na — ete hifz weak hoye jay.`,
      category: "Learning Tips",
      tags: ["hifz", "routine", "revision"],
      author: { name: "Md. Kamrul Hasan", role: "Ustad" },
      readMinutes: 6,
      featured: false,
      status: "published",
      pubDaysAgo: 18,
    },
    {
      slug: `${DEMO_BLOG_SLUG_PREFIX}portal-payment-guide`,
      title: "Portal theke payment proof pathano — step by step",
      description: "bKash, bank transfer ba Wise — fee submit kora shikhun Al Bayaan student portal diye.",
      body: `## Step 1

Student login → **Payments** menu.

## Step 2

Amount, date, method (bank transfer / Wise), reference number bhoren.

## Step 3

Screenshot upload — **required**. Trnx ID porishkar dekhte hobe.

## Step 4

Submit korar por admin approve korle **Paid until** update hobe.

## Help

Problem hole admin ke contact messages diye janaben.`,
      category: "Platform & AI",
      tags: ["portal", "payment", "bKash"],
      author: { name: "Al Bayaan Admin Team", role: "Academy" },
      readMinutes: 3,
      featured: false,
      status: "published",
      pubDaysAgo: 7,
    },
    {
      slug: `${DEMO_BLOG_SLUG_PREFIX}ramadan-quran-plan`,
      title: "Ramadan e Quran plan (draft)",
      description: "Ramadan mas er jonno family Quran routine — publish hobe shighroi.",
      body: `## Draft note

Ei post publish er age review cholche. Ramadan schedule, tarawih er por abhyas, ebong kids friendly plan thakbe.`,
      category: "Learning Tips",
      tags: ["ramadan", "draft"],
      author: { name: "Mst. Fatema Begum", role: "Ustadha" },
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
      screenshotUrl: DEMO_SCREENSHOT.url,
      screenshotPublicId: DEMO_SCREENSHOT.publicId,
      status: opts.status,
      rejectionReason: opts.rejectionReason,
      reviewedBy: opts.status !== "pending" ? adminId : undefined,
      reviewedAt: opts.status !== "pending" ? addDays(today, -1) : undefined,
      paidUntilAfter,
    });
  }

  await insertPayment({
    student: students[0],
    amount: 8500,
    currency: "BDT",
    monthsCovered: 1,
    method: "bank_transfer",
    reference: `${DEMO_PAYMENT_REF}BKASH-JAN-001`,
    status: "approved",
    paymentDaysAgo: 60,
    note: "January er maasher fee — bKash theke",
  });

  await insertPayment({
    student: students[1],
    amount: 8500,
    currency: "BDT",
    monthsCovered: 1,
    method: "bank_transfer",
    reference: `${DEMO_PAYMENT_REF}BANK-FEB-12`,
    status: "approved",
    paymentDaysAgo: 25,
    note: "Bank transfer — Dutch-Bangla",
  });

  await insertPayment({
    student: students[4],
    amount: 95,
    currency: "GBP",
    monthsCovered: 1,
    method: "bank_transfer",
    reference: `${DEMO_PAYMENT_REF}BT-GBP-8841`,
    status: "approved",
    paymentDaysAgo: 35,
    note: "UK theke bank transfer",
  });

  await insertPayment({
    student: students[5],
    amount: 120,
    currency: "USD",
    monthsCovered: 1,
    method: "wise",
    reference: `${DEMO_PAYMENT_REF}WISE-MAR-01`,
    status: "pending",
    paymentDaysAgo: 2,
    note: "March er fee — USA theke Wise",
  });

  await insertPayment({
    student: students[6],
    amount: 17000,
    currency: "BDT",
    monthsCovered: 2,
    method: "bank_transfer",
    reference: `${DEMO_PAYMENT_REF}BKASH-2MO-17K`,
    status: "pending",
    paymentDaysAgo: 1,
    note: "Dui maasher advance — verify korte hobe",
  });

  await insertPayment({
    student: students[2],
    amount: 8000,
    currency: "BDT",
    monthsCovered: 1,
    method: "bank_transfer",
    reference: `${DEMO_PAYMENT_REF}BKASH-REJECT-01`,
    status: "rejected",
    paymentDaysAgo: 10,
    rejectionReason: "Screenshot e transaction reference porishkar dekha jacche na.",
  });

  await insertPayment({
    student: students[6],
    amount: 8400,
    currency: "BDT",
    monthsCovered: 1,
    method: "bank_transfer",
    reference: `${DEMO_PAYMENT_REF}BKASH-REJECT-02`,
    status: "rejected",
    paymentDaysAgo: 20,
    rejectionReason: "Pathano amount monthly fee er shathe milche na.",
  });

  const notificationSeeds = [
    { user: students[0]._id, title: "Payment approved", message: "Apnar DEMO-BKASH-JAN-001 payment approve hoyeche.", type: "payment" as const },
    { user: students[5]._id, title: "Payment review e ache", message: "Apnar payment proof admin dekhchen — ekto opekkha korun.", type: "payment" as const },
    { user: teachers[0]._id, title: "Class log approved", message: "Apnar class log approve hoyeche.", type: "class" as const },
    { user: students[1]._id, title: "Notun homework", message: "Surah An-Nas — tajweed niye abhyas. Shighroi due.", type: "homework" as const },
  ];

  for (const n of notificationSeeds) {
    await Notification.create({ ...n, isRead: false });
  }

  if (admin) {
    await Notification.create({
      user: admin._id,
      title: "Demo data ready",
      message: "Academy demo seed shesh — Payments ebong Class Logs tab dekhben.",
      type: "general",
      isRead: false,
    });
  }

  console.log("\n=== Academy demo seed complete ===\n");
  console.log("Created:");
  console.log(`  • ${teachers.length} demo teachers`);
  console.log(`  • ${students.length} demo students`);
  console.log(`  • ${classes.length} demo classes (scheduled for today: ${todayDay})`);
  console.log("  • 5 class logs (3 pending, 2 approved)");
  console.log("  • 2 homework assignments with submissions");
  console.log("  • Attendance, progress, trials, contacts, payments");
  console.log(`  • ${blogPosts.length} blog posts (4 published, 1 draft)`);
  console.log("\nDemo password (all demo accounts):", demoPassword);
  console.log("\nSample logins:");
  console.log(`  Teacher: ${demoEmail("demo.teacher1")}  (Mst. Fatema Begum)`);
  console.log(`  Teacher: ${demoEmail("demo.teacher2")}  (Md. Kamrul Hasan)`);
  console.log(`  Student: ${demoEmail("demo.student1")}  (Ayesha Rahman — fee current)`);
  console.log(`  Student: ${demoEmail("demo.student3")}  (Fatema Yasmin — overdue)`);
  console.log(`  Student: ${demoEmail("demo.student6")}  (Ibrahim Hossain — USA, pending payment)`);
  console.log(`  Student: ${demoEmail("demo.student7")}  (Khadija Akter — pending BDT payment)`);
  console.log("\nAdmin portal: Dashboard → Payments / Class Logs / Blog / Trial Bookings");
  console.log("\nTo reset demo data:");
  console.log("  ACADEMY_DEMO_CLEAR=true npm run seed:academy-demo\n");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

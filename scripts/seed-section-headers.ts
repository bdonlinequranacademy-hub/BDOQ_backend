/**
 * Seeds section headers (eyebrow, title, subtitle) for home & public pages.
 * Run: npx ts-node scripts/seed-section-headers.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { SiteSectionHeader } from "../src/models/SiteSectionHeader";

dotenv.config();

const DEFAULT_HEADERS = [
  {
    sectionKey: "home.teachers",
    label: "Home — Teachers Preview",
    sortOrder: 0,
    contentEn: {
      eyebrow: "Our mentors",
      title: "Our respected teachers and mentors",
      subtitle:
        "Learn from qualified Hafiz and scholars — male and female instructors dedicated to your progress.",
    },
    contentBn: {
      eyebrow: "আমাদের মেন্টর",
      title: "আমাদের সম্মানিত শিক্ষক ও মেন্টর",
      subtitle:
        "যোগ্য হাফেজ ও আলেম — পুরুষ ও মহিলা শিক্ষক আপনার অগ্রগতিতে নিবেদিত।",
    },
  },
  {
    sectionKey: "home.whyChoose",
    label: "Home — Why Choose Us",
    sortOrder: 1,
    contentEn: {
      eyebrow: "Why choose us",
      title: "Why choose us?",
      subtitle:
        "Personalized Quran education with trusted teachers, flexible schedules, and a learning environment built for every student.",
    },
    contentBn: {
      eyebrow: "কেন আমাদের বেছে নেবেন",
      title: "কেন আমাদের বেছে নেবেন?",
      subtitle:
        "বিশ্বস্ত শিক্ষক, নমনীয় সময়সূচি ও প্রতিটি শিক্ষার্থীর জন্য উপযুক্ত শেখার পরিবেশে ব্যক্তিগত কুরআন শিক্ষা।",
    },
  },
  {
    sectionKey: "home.testimonials",
    label: "Home — Testimonials",
    sortOrder: 2,
    contentEn: {
      eyebrow: "Student reviews",
      title: "Why trust BDOQ?",
      subtitle:
        "Thousands of students and parents trust us for authentic Quran education online.",
    },
    contentBn: {
      eyebrow: "শিক্ষার্থী রিভিউ",
      title: "কেন BDOQ-তে আস্থা?",
      subtitle:
        "হাজারো শিক্ষার্থী ও অভিভাবক অনলাইনে প্রামাণিক কুরআন শিক্ষার জন্য আমাদের উপর ভরসা করেন।",
    },
  },
  {
    sectionKey: "home.faq",
    label: "Home — FAQ",
    sortOrder: 3,
    contentEn: {
      eyebrow: "Always here to help",
      title: "Questions and Answers",
      titleAccent: "(FAQs)",
      intro:
        "Everything you need to know before starting your Quran journey with BDOQ Academy — from free trials to class times and learning methods.",
    },
    contentBn: {
      eyebrow: "সবসময় সাহায্যের জন্য প্রস্তুত",
      title: "প্রশ্ন ও উত্তর",
      titleAccent: "(FAQ)",
      intro:
        "BDOQ Academy-তে কুরআন যাত্রা শুরু করার আগে যা জানতে হবে — ফ্রি ট্রায়াল, ক্লাস সময় ও শেখার পদ্ধতি।",
    },
  },
  {
    sectionKey: "home.about",
    label: "Home — About Snippet",
    sortOrder: 4,
    contentEn: {
      eyebrow: "About BDOQ Academy",
      title: "A reliable virtual classroom for online Quran teachers and students",
      subtitle:
        "7+ years of experience connecting students worldwide with qualified Hafiz teachers through one-to-one live classes.",
    },
    contentBn: {
      eyebrow: "BDOQ Academy সম্পর্কে",
      title: "অনলাইন কুরআন শিক্ষক ও শিক্ষার্থীদের জন্য নির্ভরযোগ্য ভার্চুয়াল ক্লাসরুম",
      subtitle:
        "৭+ বছরের অভিজ্ঞতায় বিশ্বজুড়ে শিক্ষার্থীদের যোগ্য হাফেজ শিক্ষকের সাথে ওয়ান-টু-ওয়ান লাইভ ক্লাসে সংযুক্ত করা।",
    },
  },
  {
    sectionKey: "home.globalPresence",
    label: "Home — Global Presence",
    sortOrder: 5,
    contentEn: {
      eyebrow: "Our global reach",
      title: "Our Global Presence",
      subtitle:
        "Trusted by students and families across the world — learn the Quran from wherever you are.",
    },
    contentBn: {
      eyebrow: "বিশ্বব্যাপী পৌঁছানো",
      title: "আমাদের বিশ্বব্যাপী উপস্থিতি",
      subtitle:
        "বিশ্বজুড়ে শিক্ষার্থী ও পরিবারের বিশ্বস্ত পছন্দ — যেখানেই থাকুন, কুরআন শিখুন।",
    },
  },
  {
    sectionKey: "home.liveAcademy",
    label: "Home — Live Academy",
    sortOrder: 6,
    contentEn: {
      eyebrow: "Live Academy",
      title: "Live Learning, Global Reach, Sacred Trust",
      subtitle:
        "Explore how one-to-one classes, worldwide scheduling, structured Hifz paths, and private learning spaces come together at BD Online Quran Academy.",
    },
    contentBn: {
      eyebrow: "লাইভ একাডেমি",
      title: "লাইভ শেখা, বিশ্বব্যাপী পৌঁছানো, পবিত্র আস্থা",
      subtitle:
        "ওয়ান-টু-ওয়ান ক্লাস, বিশ্বজুড়ে সময়সূচি, কাঠামোগত হিফজ পথ ও প্রাইভেট শেখার স্পেস — BDOQ Academy-তে একসাথে।",
    },
  },
  {
    sectionKey: "pages.pricing",
    label: "Pricing Page Hero",
    sortOrder: 10,
    contentEn: {
      eyebrow: "Packages & Fees",
      title: "Affordable Quran Learning Plans",
      subtitle:
        "Choose a monthly package that fits your schedule — one-to-one classes with flexible timing.",
    },
    contentBn: {
      eyebrow: "প্যাকেজ ও ফি",
      title: "সুলভ কুরআন শেখার প্ল্যান",
      subtitle:
        "আপনার সময়সূচির সাথে মানানসই মাসিক প্যাকেজ বেছে নিন — নমনীয় সময়ে ওয়ান-টু-ওয়ান ক্লাস।",
    },
  },
  {
    sectionKey: "pages.gallery",
    label: "Gallery Page Hero",
    sortOrder: 11,
    contentEn: {
      eyebrow: "Gallery",
      title: "Moments from BDOQ Academy",
      subtitle:
        "Classes, events, and learning milestones from our global Quran community.",
    },
    contentBn: {
      eyebrow: "গ্যালারি",
      title: "BDOQ Academy-র মুহূর্ত",
      subtitle:
        "আমাদের বিশ্বব্যাপী কুরআন কমিউনিটির ক্লাস, ইভেন্ট ও শেখার মাইলফলক।",
    },
  },
  {
    sectionKey: "pages.courses",
    label: "Courses Page Hero",
    sortOrder: 12,
    contentEn: {
      eyebrow: "All Courses",
      title: "Find the Right Quran Course for You",
      subtitle:
        "Private one-to-one, recorded, live, and free courses for children, men, and women.",
    },
    contentBn: {
      eyebrow: "সব কোর্স",
      title: "আপনার জন্য সঠিক কুরআন কোর্স খুঁজুন",
      subtitle:
        "শিশু, পুরুষ ও মহিলাদের জন্য প্রাইভেট, রেকর্ড, লাইভ ও ফ্রি কোর্স।",
    },
  },
  {
    sectionKey: "pages.teachers",
    label: "Teachers Page Hero",
    sortOrder: 13,
    contentEn: {
      eyebrow:
        "QURAN LEARNING UNDER THE SUPERVISION OF EXPERIENCED, TRAINED AND TRUSTED SCHOLARS",
      title: "Teachers and Mentors",
      subtitle:
        "Our male and female instructors are qualified Hafiz and scholars dedicated to guiding every student with patience, expertise, and Islamic adab.",
    },
    contentBn: {
      eyebrow: "অভিজ্ঞ, প্রশিক্ষিত ও বিশ্বস্ত আলেমদের তত্ত্বাবধানে কুরআন শিক্ষা",
      title: "শিক্ষক ও মেন্টর",
      subtitle:
        "আমাদের পুরুষ ও মহিলা শিক্ষক যোগ্য হাফেজ ও আলেম — ধৈর্য, দক্ষতা ও ইসলামি আদবে প্রতিটি শিক্ষার্থীকে পথ দেখান।",
    },
  },
  {
    sectionKey: "pages.reviews",
    label: "Reviews Page Hero",
    sortOrder: 14,
    contentEn: {
      eyebrow: "Student Reviews",
      title: "What Our Students Say",
      subtitle:
        "Real feedback from students and parents learning Quran online with BDOQ Academy.",
    },
    contentBn: {
      eyebrow: "শিক্ষার্থী রিভিউ",
      title: "আমাদের শিক্ষার্থীরা কী বলেন",
      subtitle:
        "BDOQ Academy-তে অনলাইনে কুরআন শেখা শিক্ষার্থী ও অভিভাবকদের প্রকৃত মতামত।",
    },
  },
];

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is required");
    process.exit(1);
  }

  await mongoose.connect(uri);

  for (const header of DEFAULT_HEADERS) {
    await SiteSectionHeader.findOneAndUpdate(
      { sectionKey: header.sectionKey },
      {
        $set: {
          ...header,
          showOnWebsite: true,
        },
      },
      { upsert: true, new: true }
    );
    console.log(`Seeded section header: ${header.sectionKey}`);
  }

  await mongoose.disconnect();
  console.log("Section headers seed complete.");
}

void main();

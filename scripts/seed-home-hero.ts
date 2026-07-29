/**
 * Seeds home hero carousel slides for the public website CMS.
 * Run: npx ts-node scripts/seed-home-hero.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { HomeHeroSlide } from "../src/models/HomeHeroSlide";

dotenv.config();

const DEFAULT_SLIDES = [
  {
    slideId: "slide-1",
    sortOrder: 0,
    imageUrl: "/images/hero/slide-1-global.webp",
    imageObjectPosition: "50% 40%",
    imageScale: 100,
    primaryHref: "/free-class",
    secondaryHref: "/courses",
    theme: "light" as const,
    showOnWebsite: true,
    contentEn: {
      badge: "Trusted Global Online Quran Academy",
      title:
        "Learn the Quran Online with Qualified Teachers for Kids & Adults",
      subtitle:
        "Live one-to-one and small group classes worldwide — Noorani Qaida, Tajweed, Hifz, and Islamic Studies with flexible scheduling.",
      imageAlt:
        "Learn the Quran online with qualified male and female teachers for kids and adults worldwide",
      primaryCta: "Book a Free Trial Class",
      secondaryCta: "Explore Our Courses",
    },
    contentBn: {
      badge: "বিশ্বস্ত গ্লোবাল অনলাইন কুরআন একাডেমি",
      title:
        "শিশু ও প্রাপ্তবয়স্কদের জন্য যোগ্য শিক্ষকের সাথে অনলাইনে কুরআন শিখুন",
      subtitle:
        "বিশ্বজুড়ে লাইভ ওয়ান-টু-ওয়ান ও ছোট গ্রুপ ক্লাস — নূরানী কায়দা, তাজবিদ, হিফজ ও ইসলামিক স্টাডিজ, নমনীয় সময়সূচিতে।",
      imageAlt:
        "শিশু ও প্রাপ্তবয়স্কদের জন্য যোগ্য পুরুষ ও মহিলা শিক্ষকের সাথে অনলাইনে কুরআন শিখুন",
      primaryCta: "ফ্রি ট্রায়াল ক্লাস বুক করুন",
      secondaryCta: "আমাদের কোর্স দেখুন",
    },
  },
  {
    slideId: "slide-2",
    sortOrder: 1,
    imageUrl: "/images/hero/slide-2-teachers.webp",
    imageObjectPosition: "50% 18%",
    imageScale: 94,
    primaryHref: "/teachers",
    secondaryHref: "/free-class",
    theme: "light" as const,
    showOnWebsite: true,
    contentEn: {
      badge: "Qualified Male & Female Quran Teachers",
      title: "Learn with Caring, Qualified & Experienced Teachers",
      subtitle:
        "Personalized guidance for every age and level — with separate male and female teachers who support you step by step.",
      imageAlt:
        "Learn with caring, qualified and experienced Quran teachers",
      primaryCta: "Meet Our Teachers",
      secondaryCta: "Book a Free Trial Class",
    },
    contentBn: {
      badge: "যোগ্য পুরুষ ও মহিলা কুরআন শিক্ষক",
      title: "যত্নশীল, যোগ্য ও অভিজ্ঞ শিক্ষকদের সাথে শিখুন",
      subtitle:
        "প্রতিটি বয়স ও স্তরের জন্য ব্যক্তিগত গাইডেন্স — আলাদা পুরুষ ও মহিলা শিক্ষক, ধাপে ধাপে পাশে থাকবেন।",
      imageAlt: "যত্নশীল, যোগ্য ও অভিজ্ঞ কুরআন শিক্ষকদের সাথে শিখুন",
      primaryCta: "আমাদের শিক্ষক দেখুন",
      secondaryCta: "ফ্রি ট্রায়াল ক্লাস বুক করুন",
    },
  },
  {
    slideId: "slide-3",
    sortOrder: 2,
    imageUrl: "/images/hero/slide-3-courses.webp",
    imageObjectPosition: "45% 45%",
    imageScale: 100,
    primaryHref: "/courses",
    secondaryHref: "/#learning-plans",
    theme: "light" as const,
    showOnWebsite: true,
    contentEn: {
      badge: "Comprehensive Quran & Islamic Courses",
      title: "One Academy for All Your Quran Learning Needs",
      subtitle:
        "From Noorani Qaida to Tajweed, Hifz, Islamic Studies, and Arabic — a complete pathway for kids and adults.",
      imageAlt: "One academy for all your Quran learning needs",
      primaryCta: "Explore Our Courses",
      secondaryCta: "View Learning Path",
    },
    contentBn: {
      badge: "বিস্তৃত কুরআন ও ইসলামিক কোর্স",
      title: "আপনার সব কুরআন শেখার প্রয়োজন এক একাডেমিতে",
      subtitle:
        "নূরানী কায়দা থেকে তাজবিদ, হিফজ, ইসলামিক স্টাডিজ ও আরবি — শিশু ও প্রাপ্তবয়স্কদের জন্য সম্পূর্ণ পথ।",
      imageAlt: "আপনার সব কুরআন শেখার প্রয়োজন এক একাডেমিতে",
      primaryCta: "আমাদের কোর্স দেখুন",
      secondaryCta: "লার্নিং পাথ দেখুন",
    },
  },
  {
    slideId: "slide-4",
    sortOrder: 3,
    imageUrl: "/images/hero/slide-4-journey.webp",
    imageObjectPosition: "50% 45%",
    imageScale: 100,
    primaryHref: "/free-class",
    secondaryHref: "/#how-to-start",
    theme: "light" as const,
    showOnWebsite: true,
    contentEn: {
      badge: "Trusted by 300+ students across 10 countries",
      title: "Start Your Quran Journey in a Few Simple Steps.",
      titleHighlight: "Journey",
      subtitle:
        "Book a free trial, meet your teacher, complete admission, and begin regular classes through our Student Portal.",
      imageAlt:
        "Start your Quran learning journey in just a few simple steps",
      primaryCta: "Book a Free Trial Class",
      secondaryCta: "How It Works",
    },
    contentBn: {
      badge: "১০+ দেশে ৩০০+ শিক্ষার্থীর বিশ্বস্ত পছন্দ",
      title: "কয়েকটি সহজ ধাপে আপনার কুরআন যাত্রা শুরু করুন।",
      titleHighlight: "যাত্রা",
      subtitle:
        "ফ্রি ট্রায়াল বুক করুন, শিক্ষকের সাথে পরিচিত হন, ভর্তি সম্পন্ন করুন এবং স্টুডেন্ট পোর্টালে নিয়মিত ক্লাস শুরু করুন।",
      imageAlt: "কয়েকটি সহজ ধাপে আপনার কুরআন শেখার যাত্রা শুরু করুন",
      primaryCta: "ফ্রি ট্রায়াল ক্লাস বুক করুন",
      secondaryCta: "কীভাবে কাজ করে",
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

  for (const slide of DEFAULT_SLIDES) {
    await HomeHeroSlide.findOneAndUpdate(
      { slideId: slide.slideId },
      { $set: slide },
      { upsert: true, new: true }
    );
    console.log(`Seeded home hero slide: ${slide.slideId}`);
  }

  await mongoose.disconnect();
  console.log("Home hero seed complete.");
}

void main();

/**
 * Exports course details + marketing arrays to marketing-seed.json
 * Run from My-Academy: npx ts-node --transpile-only scripts/export-marketing-seed.ts
 */
import fs from "fs";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { COURSE_DETAIL_MAP } = require("../../public-site/lib/courseDetails.ts");

const COURSES = [
  {
    slug: "noorani-qaida",
    title: "Noorani Qaida Course",
    target: "Children",
    description: "Foundation Arabic alphabet and Quran reading basics",
    icon: "📖",
    category: "private",
    gender: "children",
  },
  {
    slug: "quran-hifz-male",
    title: "Quran Hifz Course (Male)",
    description: "Complete Quran memorization for males",
    icon: "🕌",
    category: "private",
    gender: "male",
  },
  {
    slug: "quran-hifz-female",
    title: "Quran Hifz Course (Women)",
    description: "Complete Quran memorization for women with female teachers",
    icon: "🌙",
    category: "private",
    gender: "female",
  },
  {
    slug: "tajweed-male",
    title: "Quran Learning with Tajweed (Male)",
    description: "Proper Quran recitation with Tajweed rules",
    icon: "📿",
    category: "private",
    gender: "male",
  },
  {
    slug: "tajweed-female",
    title: "Quran Learning with Tajweed (Women)",
    description: "Tajweed for women with female certified teachers",
    icon: "⭐",
    category: "private",
    gender: "female",
  },
  {
    slug: "free-learning",
    title: "Free Quran Learning Course",
    description: "Start your Quran journey at no cost",
    icon: "🎁",
    category: "free",
  },
];

const PACKAGES = [
  {
    slug: "basic",
    name: "Basic",
    priceBdt: 2000,
    priceUsd: 25,
    period: "Monthly",
    features: [
      "One-to-one class benefits",
      "Classes 2 days a week",
      "8 days of classes per month",
      "Class duration: 30 minutes",
      "Convenient class times",
      "Noorani/Najera Basic",
    ],
    popular: false,
    sortOrder: 1,
  },
  {
    slug: "standard",
    name: "Standard",
    priceBdt: 3000,
    priceUsd: 35,
    period: "Monthly",
    features: [
      "One-to-one class benefits",
      "Classes 3 days a week",
      "12 days of classes per month",
      "Class duration: 40 minutes",
      "Convenient class times",
      "Najera with Tajweed",
    ],
    popular: true,
    sortOrder: 2,
  },
  {
    slug: "advance",
    name: "Advance",
    priceBdt: 4000,
    priceUsd: 45,
    period: "Monthly",
    features: [
      "One-to-one class benefits",
      "Classes 4 days a week",
      "16 days of classes per month",
      "Class duration: 50 minutes",
      "Convenient class times",
      "Najera with Tajweed",
    ],
    popular: false,
    sortOrder: 3,
  },
  {
    slug: "premium",
    name: "Premium",
    priceBdt: 5000,
    priceUsd: 55,
    period: "Monthly",
    features: [
      "One-to-one class benefits",
      "Classes 5 days a week",
      "20 days of classes per month",
      "Class duration: 60 minutes",
      "Convenient class times",
      "Hifz/Advance Tajweed",
    ],
    popular: false,
    sortOrder: 4,
  },
];

const TESTIMONIALS = [
  {
    externalId: "testimonial-1",
    name: "Rahima Khatun",
    role: "Student",
    location: "Dhaka, Bangladesh",
    content:
      "Alhamdulillah, BD Online Quran Academy has been a blessing for our family. My daughter learns Noorani Qaida one-to-one with a caring female teacher. The class times fit our schedule perfectly.",
    rating: 5,
    image: "/images/testimonials/student-1.webp",
    sortOrder: 1,
  },
  {
    externalId: "testimonial-2",
    name: "Ahmed Malik",
    role: "Student",
    location: "Los Angeles, America",
    content:
      "I enrolled in the Tajweed course while working full-time in the US. BDOQ Academy matched me with an experienced teacher who explains rules clearly in English. The live classes are interactive.",
    rating: 5,
    image: "/images/testimonials/student-2.webp",
    sortOrder: 2,
  },
  {
    externalId: "testimonial-3",
    name: "Fatima Begum",
    role: "Parent",
    location: "Dhaka, Bangladesh",
    content:
      "We chose BDOQ Academy because of their separate system for women and qualified Hafiz teachers. My son is memorizing the Quran with excellent supervision and monthly progress reports.",
    rating: 5,
    sortOrder: 3,
  },
  {
    externalId: "testimonial-4",
    name: "Arafat Hossain",
    role: "Student",
    location: "Los Angeles, America",
    content:
      "Fortunately, due to knowing English and having a flexible schedule, I could continue learning Quran under Hafiz teachers. The qualified teachers of BDOQ Academy teach Tajweed excellently from Los Angeles.",
    rating: 5,
    image: "/images/testimonials/student-2.webp",
    sortOrder: 4,
  },
  {
    externalId: "testimonial-5",
    name: "Abdullah",
    role: "Student",
    location: "Los Angeles, America",
    content:
      "I could never have imagined Quran from Bangladesh could be taught to such an international standard. I am confidently memorizing the Quran with a dedicated Hafiz teacher at BDOQ Academy.",
    rating: 5,
    image: "/images/testimonials/student-1.webp",
    sortOrder: 5,
  },
  {
    externalId: "testimonial-6",
    name: "Nusrat Fatima",
    role: "Student",
    location: "Dhaka, Bangladesh",
    content:
      "In our country there are many madrasas, but not everyone has equal opportunities for women to learn. I found a place where women study with qualified female teachers only — that is why I chose BDOQ.",
    rating: 5,
    sortOrder: 6,
  },
];

const FAQ = [
  {
    externalId: "faq-1",
    question: "How do I book a free trial class?",
    answer:
      "Visit our Free Trial Class page, fill in your name, contact details, subject interest, and preferred time. Our team will contact you via WhatsApp or email to confirm your schedule and assign a suitable teacher for your first session.",
    sortOrder: 1,
  },
  {
    externalId: "faq-2",
    question: "When is BDOQ's class time?",
    answer:
      "BDOQ Academy offers flexible class times to suit students in Bangladesh and worldwide. You can choose morning, afternoon, or evening slots based on your timezone. Classes are scheduled according to your availability during registration.",
    sortOrder: 2,
  },
  {
    externalId: "faq-3",
    question: "What platform do you use for online classes?",
    answer:
      "We conduct live classes through reliable video conferencing platforms with screen sharing and audio clarity optimized for Quran teaching. Your teacher will share the meeting link before each session, and technical support is available if needed.",
    sortOrder: 3,
  },
  {
    externalId: "faq-4",
    question: "What age group can students enroll in the course?",
    answer:
      "Students of all ages can enroll — from young children starting Noorani Qaida to adults learning Tajweed or Hifz. We match each student with an appropriate teacher and learning plan based on age, level, and goals.",
    sortOrder: 4,
  },
  {
    externalId: "faq-5",
    question: "How are teachers selected for students?",
    answer:
      "BDOQ Academy assigns teachers based on the student's gender, course type, language preference, and schedule. All teachers are experienced Hafiz or qualified scholars who undergo evaluation to maintain our international teaching standards.",
    sortOrder: 5,
  },
  {
    externalId: "faq-6",
    question: "Is there a system for girls to learn the Holy Quran?",
    answer:
      "Yes. BDOQ Academy provides a fully separate education system for women and girls with qualified female teachers. This ensures privacy, comfort, and focused learning for sisters of all ages in a safe online environment.",
    sortOrder: 6,
  },
];

const GALLERY = [
  { externalId: "g1", title: "Online class session", album: "gallery-01", coverGradient: "from-primary to-teal", heightClass: "h-56", sortOrder: 1 },
  { externalId: "g2", title: "Student recitation practice", album: "gallery-01", coverGradient: "from-primary-dark to-primary", heightClass: "h-72", sortOrder: 2 },
  { externalId: "g3", title: "Teacher mentoring session", album: "gallery-01", coverGradient: "from-teal to-primary-dark", heightClass: "h-48", sortOrder: 3 },
  { externalId: "g4", title: "Noorani Qaida class", album: "gallery-01", coverGradient: "from-gold/70 to-primary-dark", heightClass: "h-64", sortOrder: 4 },
  { externalId: "g5", title: "Tajweed workshop", album: "gallery-02", coverGradient: "from-primary to-gold/60", heightClass: "h-60", sortOrder: 5 },
  { externalId: "g6", title: "Hifz progress review", album: "gallery-02", coverGradient: "from-teal-accent/60 to-primary", heightClass: "h-52", sortOrder: 6 },
  { externalId: "g7", title: "Female teachers team", album: "gallery-02", coverGradient: "from-primary-dark to-teal-accent/50", heightClass: "h-72", sortOrder: 7 },
  { externalId: "g8", title: "International students", album: "gallery-02", coverGradient: "from-primary to-primary-dark", heightClass: "h-48", sortOrder: 8 },
  { externalId: "g9", title: "Academy orientation", album: "gallery-03", coverGradient: "from-teal to-primary", heightClass: "h-64", sortOrder: 9 },
  { externalId: "g10", title: "Certificate ceremony", album: "gallery-03", coverGradient: "from-gold/80 to-teal", heightClass: "h-56", sortOrder: 10 },
  { externalId: "g11", title: "Parent meeting", album: "gallery-03", coverGradient: "from-primary-dark to-gold/50", heightClass: "h-60", sortOrder: 11 },
  { externalId: "g12", title: "Community gathering", album: "gallery-03", coverGradient: "from-primary to-teal-accent/70", heightClass: "h-72", sortOrder: 12 },
];

const payload = {
  courses: COURSES.map((course, index) => ({
    ...course,
    sortOrder: index + 1,
    detail: COURSE_DETAIL_MAP[course.slug],
  })),
  packages: PACKAGES,
  testimonials: TESTIMONIALS,
  faq: FAQ,
  gallery: GALLERY,
};

const outPath = path.join(__dirname, "data", "marketing-seed.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(`Exported marketing seed to ${outPath}`);

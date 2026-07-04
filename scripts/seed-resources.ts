/**
 * Seeds published resources (ebooks, audio, videos) from static public-site content.
 * Idempotent — safe to re-run; updates featured flags and metadata on existing rows.
 *
 * Usage (from My-Academy):
 *   npm run seed:resources
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Resource } from "../src/models/Resource";
import { User } from "../src/models/User";

dotenv.config();

const EBOOKS = [
  {
    slug: "tajweed-made-easy",
    title: "Tajweed Rules Made Easy",
    category: "tajweed" as const,
    description:
      "A practical guide to essential Tajweed rules for correct Quran recitation, with examples for beginners.",
    coverGradient: "from-primary to-primary-dark",
    pdfUrl: "/ebooks/tajweed-made-easy.pdf",
    fileSize: "1.8 MB",
    pageCount: 48,
    language: "en" as const,
    author: "BOQ Academy",
    featured: true,
  },
  {
    slug: "tajweed-pronunciation",
    title: "Correct Pronunciation in Quran Recitation",
    category: "tajweed" as const,
    description:
      "Makharij and Sifaat explained step by step for students learning Tajweed with a teacher.",
    coverGradient: "from-teal to-primary-dark",
    pdfUrl: "/ebooks/tajweed-pronunciation.pdf",
    fileSize: "2.1 MB",
    pageCount: 56,
    language: "both" as const,
    author: "BOQ Academy",
    featured: true,
  },
  {
    slug: "seerah-overview",
    title: "Brief History of Islam — Seerah Overview",
    category: "islamic-history" as const,
    description:
      "Key events from the life of Prophet Muhammad (ﷺ) and the early Muslim community for young learners.",
    coverGradient: "from-gold/80 to-primary-dark",
    pdfUrl: "/ebooks/seerah-overview.pdf",
    fileSize: "3.2 MB",
    pageCount: 72,
    language: "en" as const,
    author: "BOQ Academy",
  },
  {
    slug: "khulafa-rashidun",
    title: "The Rightly Guided Caliphs",
    category: "islamic-history" as const,
    description:
      "An introduction to the Khulafa Rashidun and their contributions to Islamic civilization.",
    coverGradient: "from-primary-dark to-teal",
    pdfUrl: "/ebooks/khulafa-rashidun.pdf",
    fileSize: "2.6 MB",
    pageCount: 64,
    language: "en" as const,
    author: "BOQ Academy",
  },
  {
    slug: "daily-duas",
    title: "Daily Duas for Muslim Families",
    category: "religious" as const,
    description:
      "Essential supplications for morning, evening, and daily activities with transliteration.",
    coverGradient: "from-primary to-teal-accent",
    pdfUrl: "/ebooks/daily-duas.pdf",
    fileSize: "1.4 MB",
    pageCount: 36,
    language: "both" as const,
    author: "BOQ Academy",
  },
  {
    slug: "pillars-of-islam",
    title: "Understanding the Five Pillars of Islam",
    category: "religious" as const,
    description:
      "A clear explanation of Shahada, Salah, Zakat, Sawm, and Hajj for students and parents.",
    coverGradient: "from-teal-accent/80 to-primary",
    pdfUrl: "/ebooks/pillars-of-islam.pdf",
    fileSize: "2.0 MB",
    pageCount: 52,
    language: "en" as const,
    author: "BOQ Academy",
  },
];

const FATIHA_VERSES = [
  {
    arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    translation:
      "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
  },
  {
    arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
    translation: "All praise is due to Allah, Lord of the worlds.",
  },
  {
    arabic: "الرَّحْمَٰنِ الرَّحِيمِ",
    translation: "The Entirely Merciful, the Especially Merciful.",
  },
  {
    arabic: "مَالِكِ يَوْمِ الدِّينِ",
    translation: "Sovereign of the Day of Recompense.",
  },
  {
    arabic: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
    translation: "It is You we worship and You we ask for help.",
  },
  {
    arabic: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ",
    translation: "Guide us to the straight path.",
  },
  {
    arabic:
      "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
    translation:
      "The path of those upon whom You have bestowed favor, not of those who have evoked anger or gone astray.",
  },
];

const RECITATIONS = [
  {
    slug: "surah-rahman",
    surahName: "Surah Ar-Rahman",
    paraInfo: "Para 27 — Juz 27",
    duration: "12:45",
    progress: 35,
  },
  {
    slug: "surah-yasin",
    surahName: "Surah Yasin",
    paraInfo: "Para 22 — Juz 22",
    duration: "18:20",
    progress: 60,
  },
  {
    slug: "surah-mulk",
    surahName: "Surah Al-Mulk",
    paraInfo: "Para 29 — Juz 29",
    duration: "8:15",
    progress: 20,
  },
  {
    slug: "surah-ikhlas",
    surahName: "Surah Al-Ikhlas",
    paraInfo: "Para 30 — Juz 30",
    duration: "1:05",
    progress: 80,
  },
];

const GALLERY_VIDEOS = [
  { slug: "noorani-intro", title: "Noorani Qaida — Lesson Introduction", youtubeId: "rLmCad9JH3s" },
  { slug: "tajweed-basics", title: "Tajweed Basics for Beginners", youtubeId: "i_nu7AvcTaE" },
  { slug: "one-to-one-classes", title: "How One-to-One Classes Work at BOQ", youtubeId: "uu0FOZZtz_M" },
  { slug: "surah-fatiha", title: "Surah Al-Fatiha — Beautiful Recitation", youtubeId: "G61P8D6K380" },
  { slug: "surah-rahman", title: "Surah Ar-Rahman — Quran Recitation", youtubeId: "HDRL7J8-MDM" },
  { slug: "surah-yaseen", title: "Surah Yaseen — Full Recitation", youtubeId: "O3n5HNC7AUs" },
];

const PLAYLIST_VIDEOS = [
  { slug: "getting-started", title: "Getting Started with Online Quran Learning", youtubeId: "uu0FOZZtz_M" },
  { slug: "tajweed-importance", title: "Importance of Tajweed in Recitation", youtubeId: "i_nu7AvcTaE" },
  { slug: "surah-mulk", title: "Surah Al-Mulk — Quran Recitation", youtubeId: "4dHMsRxbOac" },
  { slug: "surah-kahf", title: "Surah Al-Kahf — Full Recitation", youtubeId: "k17GympXbrE" },
  { slug: "class-system", title: "BDOQ Academy Class System Explained", youtubeId: "uu0FOZZtz_M" },
];

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is required");
    process.exit(1);
  }

  await mongoose.connect(uri);

  const admin =
    (await User.findOne({ role: { $in: ["admin", "super_admin"] } })) ??
    (await User.findOne());

  if (!admin) {
    console.error("No user found for createdBy — create an admin user first");
    process.exit(1);
  }

  let created = 0;
  let updated = 0;

  for (let i = 0; i < EBOOKS.length; i += 1) {
    const book = EBOOKS[i];
    const exists = await Resource.findOne({ type: "ebook", slug: book.slug });
    if (exists) {
      await Resource.updateOne(
        { _id: exists._id },
        {
          $set: {
            ...book,
            type: "ebook",
            section: "default",
            status: "published",
            sortOrder: i,
            publishedAt: exists.publishedAt ?? new Date(),
          },
        }
      );
      updated += 1;
      continue;
    }
    await Resource.create({
      ...book,
      type: "ebook",
      section: "default",
      status: "published",
      featured: book.featured ?? false,
      sortOrder: i,
      publishedAt: new Date(),
      createdBy: admin._id,
    });
    created += 1;
  }

  const audioFeatured = await Resource.findOne({
    type: "audio",
    section: "featured",
  });
  const featuredAudioPayload = {
    type: "audio" as const,
    section: "featured" as const,
    title: "Surah Al-Fatiha — Quran Recitation",
    slug: "surah-fatiha-featured",
    audioUrl:
      "https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/1.mp3",
    status: "published" as const,
    featured: true,
    sortOrder: 0,
    publishedAt: new Date(),
    createdBy: admin._id,
  };
  if (!audioFeatured) {
    await Resource.create(featuredAudioPayload);
    created += 1;
  } else {
    await Resource.updateOne(
      { _id: audioFeatured._id },
      {
        $set: {
          title: featuredAudioPayload.title,
          audioUrl: featuredAudioPayload.audioUrl,
          featured: true,
          status: "published",
        },
      }
    );
    updated += 1;
  }

  const versesDoc = await Resource.findOne({ type: "audio", section: "verses" });
  if (!versesDoc) {
    await Resource.create({
      type: "audio",
      section: "verses",
      title: "Surah Al-Fatiha — Verses",
      slug: "surah-fatiha-verses",
      verses: FATIHA_VERSES,
      status: "published",
      sortOrder: 1,
      publishedAt: new Date(),
      createdBy: admin._id,
    });
    created += 1;
  } else {
    await Resource.updateOne(
      { _id: versesDoc._id },
      { $set: { verses: FATIHA_VERSES, status: "published" } }
    );
    updated += 1;
  }

  for (let i = 0; i < RECITATIONS.length; i += 1) {
    const rec = RECITATIONS[i];
    const exists = await Resource.findOne({ type: "audio", slug: rec.slug });
    if (exists) {
      updated += 1;
      continue;
    }
    await Resource.create({
      type: "audio",
      section: "recitation",
      title: rec.surahName,
      slug: rec.slug,
      surahName: rec.surahName,
      paraInfo: rec.paraInfo,
      duration: rec.duration,
      progress: rec.progress,
      status: "published",
      sortOrder: i + 2,
      publishedAt: new Date(),
      createdBy: admin._id,
    });
    created += 1;
  }

  const featuredVideo = await Resource.findOne({
    type: "video",
    section: "featured",
  });
  if (!featuredVideo) {
    await Resource.create({
      type: "video",
      section: "featured",
      title: "Welcome to BD Online Quran Academy",
      slug: "welcome-boq",
      description:
        "Discover how BOQ Academy delivers one-to-one online Quran education with experienced teachers worldwide.",
      youtubeId: "uu0FOZZtz_M",
      startSeconds: 3,
      status: "published",
      featured: true,
      sortOrder: 0,
      publishedAt: new Date(),
      createdBy: admin._id,
    });
    created += 1;
  } else {
    await Resource.updateOne(
      { _id: featuredVideo._id },
      {
        $set: {
          title: "Welcome to BD Online Quran Academy",
          youtubeId: "uu0FOZZtz_M",
          featured: true,
          status: "published",
        },
      }
    );
    updated += 1;
  }

  for (let i = 0; i < GALLERY_VIDEOS.length; i += 1) {
    const video = GALLERY_VIDEOS[i];
    const exists = await Resource.findOne({ type: "video", slug: video.slug });
    if (exists) {
      await Resource.updateOne(
        { _id: exists._id },
        {
          $set: {
            title: video.title,
            youtubeId: video.youtubeId,
            section: "gallery",
            status: "published",
            sortOrder: i,
          },
        }
      );
      updated += 1;
      continue;
    }
    await Resource.create({
      type: "video",
      section: "gallery",
      ...video,
      status: "published",
      sortOrder: i,
      publishedAt: new Date(),
      createdBy: admin._id,
    });
    created += 1;
  }

  for (let i = 0; i < PLAYLIST_VIDEOS.length; i += 1) {
    const video = PLAYLIST_VIDEOS[i];
    const exists = await Resource.findOne({ type: "video", slug: video.slug });
    if (exists) {
      await Resource.updateOne(
        { _id: exists._id },
        {
          $set: {
            title: video.title,
            youtubeId: video.youtubeId,
            section: "playlist",
            status: "published",
            sortOrder: i,
          },
        }
      );
      updated += 1;
      continue;
    }
    await Resource.create({
      type: "video",
      section: "playlist",
      ...video,
      status: "published",
      sortOrder: i,
      publishedAt: new Date(),
      createdBy: admin._id,
    });
    created += 1;
  }

  console.log(`Resources seed done: ${created} created, ${updated} updated`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

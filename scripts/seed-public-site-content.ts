/**
 * Seeds public marketing content (courses, pricing, testimonials, FAQ, gallery).
 * Run: npx ts-node scripts/seed-public-site-content.ts
 */
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { CourseCatalog } from "../src/models/CourseCatalog";
import { PricingPackage } from "../src/models/PricingPackage";
import { Testimonial } from "../src/models/Testimonial";
import { FaqItem } from "../src/models/FaqItem";
import { GalleryItem } from "../src/models/GalleryItem";

dotenv.config();

interface IMarketingSeed {
  courses: Array<Record<string, unknown>>;
  packages: Array<Record<string, unknown>>;
  testimonials: Array<Record<string, unknown>>;
  faq: Array<Record<string, unknown>>;
  gallery: Array<Record<string, unknown>>;
}

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is required");
    process.exit(1);
  }

  const seedPath = path.join(__dirname, "data", "marketing-seed.json");
  if (!fs.existsSync(seedPath)) {
    console.error(
      "marketing-seed.json not found. Run: npx ts-node scripts/export-marketing-seed.ts"
    );
    process.exit(1);
  }

  const seed = JSON.parse(fs.readFileSync(seedPath, "utf8")) as IMarketingSeed;
  await mongoose.connect(uri);

  for (const course of seed.courses) {
    await CourseCatalog.findOneAndUpdate(
      { slug: course.slug },
      {
        $set: {
          slug: course.slug,
          title: course.title,
          description: course.description,
          icon: course.icon ?? "📖",
          target: course.target,
          category: course.category,
          gender: course.gender,
          sortOrder: course.sortOrder ?? 0,
          showOnWebsite: true,
          detail: course.detail,
        },
      },
      { upsert: true, new: true }
    );
  }

  for (const pkg of seed.packages) {
    await PricingPackage.findOneAndUpdate(
      { slug: pkg.slug },
      {
        $set: {
          slug: pkg.slug,
          name: pkg.name,
          priceBdt: pkg.priceBdt,
          priceUsd: pkg.priceUsd,
          period: pkg.period,
          features: pkg.features ?? [],
          popular: Boolean(pkg.popular),
          sortOrder: pkg.sortOrder ?? 0,
          showOnWebsite: true,
        },
      },
      { upsert: true, new: true }
    );
  }

  for (const item of seed.testimonials) {
    await Testimonial.findOneAndUpdate(
      { externalId: item.externalId },
      {
        $set: {
          externalId: item.externalId,
          name: item.name,
          role: item.role,
          location: item.location,
          content: item.content,
          rating: item.rating ?? 5,
          image: item.image,
          mediaType: item.mediaType ?? "text",
          mediaUrl: item.mediaUrl,
          youtubeId: item.youtubeId,
          sortOrder: item.sortOrder ?? 0,
          showOnWebsite: true,
        },
      },
      { upsert: true, new: true }
    );
  }

  for (const item of seed.faq) {
    await FaqItem.findOneAndUpdate(
      { externalId: item.externalId },
      {
        $set: {
          externalId: item.externalId,
          question: item.question,
          answer: item.answer,
          sortOrder: item.sortOrder ?? 0,
          showOnWebsite: true,
        },
      },
      { upsert: true, new: true }
    );
  }

  for (const item of seed.gallery) {
    await GalleryItem.findOneAndUpdate(
      { externalId: item.externalId },
      {
        $set: {
          externalId: item.externalId,
          title: item.title,
          album: item.album,
          mediaType: item.mediaType ?? "photo",
          coverGradient: item.coverGradient,
          heightClass: item.heightClass ?? "h-56",
          sortOrder: item.sortOrder ?? 0,
          showOnWebsite: true,
        },
      },
      { upsert: true, new: true }
    );
  }

  console.log(
    `✓ Seeded marketing content: ${seed.courses.length} courses, ${seed.packages.length} packages, ${seed.testimonials.length} testimonials, ${seed.faq.length} FAQ, ${seed.gallery.length} gallery items`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

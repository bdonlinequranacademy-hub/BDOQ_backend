/**
 * Uploads default BDOQ Academy avatars to Cloudinary.
 * Run: npx tsx scripts/seed-cloudinary-avatars.ts
 */
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_SITE_TEACHERS = path.resolve(
  __dirname,
  "../../public-site/public/images/teachers"
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const TEACHER_SLUGS = [
  "hafez-mawlana-rahmatullah",
  "mawlana-farid-ahmed",
  "ustadha-ayesha-khan",
  "mawlana-ibrahim-hassan",
  "hafez-yusuf-ali",
  "mawlana-kamal-uddin",
  "hafez-abdullah-chowdhury",
  "mawlana-tariq-islam",
  "wardah-shehryar",
  "ustadha-fatima-rahman",
  "ustadha-maryam-siddique",
  "ustadha-khadija-akter",
  "ustadha-nusrat-jahan",
];

function dicebearPng(seed: string, style = "lorelei"): string {
  return `https://api.dicebear.com/7.x/${style}/png?seed=${encodeURIComponent(seed)}&size=512&backgroundColor=e8f5ee`;
}

async function uploadFromUrl(publicId: string, sourceUrl: string) {
  const result = await cloudinary.uploader.upload(sourceUrl, {
    public_id: publicId,
    overwrite: true,
    resource_type: "image",
    transformation: [{ width: 512, height: 512, crop: "fill", gravity: "face" }],
  });
  console.log("✓", result.public_id);
  return result.secure_url;
}

async function uploadFromFile(publicId: string, filePath: string) {
  const result = await cloudinary.uploader.upload(filePath, {
    public_id: publicId,
    overwrite: true,
    resource_type: "image",
    transformation: [{ width: 512, height: 512, crop: "fill", gravity: "center" }],
  });
  console.log("✓", result.public_id);
  return result.secure_url;
}

async function main() {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error("CLOUDINARY_* env vars required");
  }

  const root = "bdoq-academy/avatars";

  await uploadFromFile(
    `${root}/defaults/male-teacher`,
    path.join(PUBLIC_SITE_TEACHERS, "male-teacher.png")
  );
  await uploadFromFile(
    `${root}/defaults/female-teacher`,
    path.join(PUBLIC_SITE_TEACHERS, "female-teacher.png")
  );

  await uploadFromUrl(
    `${root}/founder/abdul-mumin-khan`,
    dicebearPng("abdul-mumin-khan-founder", "adventurer-neutral")
  );

  for (let i = 1; i <= 5; i += 1) {
    await uploadFromUrl(
      `${root}/testimonials/student-${i}`,
      dicebearPng(`bdoq-student-${i}`, "avataaars")
    );
  }

  for (const slug of TEACHER_SLUGS) {
    const style = slug.includes("ustadha") || slug.includes("wardah") ? "lorelei" : "adventurer-neutral";
    await uploadFromUrl(`${root}/teachers/${slug}`, dicebearPng(slug, style));
  }

  console.log("\nDone. Cloud name:", process.env.CLOUDINARY_CLOUD_NAME);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

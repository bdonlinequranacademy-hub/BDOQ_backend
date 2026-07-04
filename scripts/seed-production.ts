/**
 * One-command production demo seed — clears previous seed data and repopulates
 * academy users, live monitor slots, payments, blog, admissions, and resources.
 *
 * Prerequisites:
 *   1. MONGO_URI in .env
 *   2. At least one admin/super_admin (npm run seed:super-admin)
 *
 * Usage (from My-Academy):
 *   npm run seed:production
 */
import { execSync } from "child_process";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const rootDir = path.join(__dirname, "..");

function runScript(scriptName: string, extraEnv: Record<string, string> = {}): void {
  console.log(`\n▶ Running ${scriptName}...\n`);
  execSync(`npx ts-node scripts/${scriptName}`, {
    cwd: rootDir,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
}

async function main(): Promise<void> {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is required. Set it in My-Academy/.env");
    process.exit(1);
  }

  console.log("=== BOQ Academy — Production Demo Seed ===");
  console.log("This will replace all @seed.boq.academy demo data.\n");

  runScript("seed-academy-demo.ts", { ACADEMY_SEED_CLEAR: "true" });
  runScript("seed-resources.ts");
  runScript("seed-public-teachers.ts");
  runScript("seed-public-site-content.ts");

  console.log("\n=== Production seed complete ===");
  console.log("Portal logins: seed.teacher1@seed.boq.academy / Sample1234!");
  console.log("Public site: ebooks, audio & videos are published from API");
  console.log("Admin: Dashboard → Live Monitor, Payments, Admissions\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * One-time bootstrap: creates the first super_admin if none exists.
 *
 * Usage (from myAcademy-backend):
 *   SUPER_ADMIN_NAME="Your Name" SUPER_ADMIN_EMAIL="you@example.com" SUPER_ADMIN_PASSWORD="secret" npm run seed:super-admin
 */
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../src/models/User";

dotenv.config();

function cleanEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.trim().replace(/^["']|["']$/g, "").replace(/;+$/, "");
}

async function main(): Promise<void> {
  const name = cleanEnv(process.env.SUPER_ADMIN_NAME);
  const email = cleanEnv(process.env.SUPER_ADMIN_EMAIL)?.toLowerCase();
  const password = cleanEnv(process.env.SUPER_ADMIN_PASSWORD);
  const resetPassword = cleanEnv(process.env.SUPER_ADMIN_RESET_PASSWORD) === "true";

  if (!name || !email || !password) {
    console.error(
      "Set SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD in the environment."
    );
    process.exit(1);
  }

  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const existingSuper = await User.findOne({ role: "super_admin" });

  if (resetPassword && password && password.length >= 6 && email) {
    const target =
      (await User.findOne({ email })) ??
      existingSuper;

    if (!target) {
      console.error(`No user found for ${email}`);
      process.exit(1);
    }

    target.role = "super_admin";
    target.emailVerified = true;
    target.isActive = true;
    target.password = await bcrypt.hash(password, 10);
    if (name) target.name = name;
    await target.save();
    console.log(`Super admin password reset for: ${target.email}`);
    await mongoose.disconnect();
    return;
  }

  if (existingSuper) {
    console.log(`Super admin already exists: ${existingSuper.email}`);
    console.log("To reset password, set SUPER_ADMIN_RESET_PASSWORD=true and run again.");
    await mongoose.disconnect();
    return;
  }

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    existingEmail.role = "super_admin";
    existingEmail.emailVerified = true;
    existingEmail.isActive = true;
    if (password.length >= 6) {
      existingEmail.password = await bcrypt.hash(password, 10);
    }
    await existingEmail.save();
    console.log(`Promoted existing user to super_admin: ${email}`);
    await mongoose.disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await User.create({
    name,
    email,
    password: hashedPassword,
    role: "super_admin",
    authProvider: "local",
    emailVerified: true,
    isActive: true,
  });

  console.log(`Super admin created: ${email}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

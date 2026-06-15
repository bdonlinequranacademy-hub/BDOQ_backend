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

async function main(): Promise<void> {
  const name = process.env.SUPER_ADMIN_NAME?.trim();
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;

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
  if (existingSuper) {
    console.log(`Super admin already exists: ${existingSuper.email}`);
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

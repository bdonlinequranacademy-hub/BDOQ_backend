/**
 * One-time script: mark every user as email-verified and clear pending tokens.
 *
 * Usage: npm run verify-users
 */
import "../src/config/loadEnv";
import mongoose from "mongoose";
import { User } from "../src/models/User";

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI is not set in .env");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  const before = await User.countDocuments({
    $or: [{ emailVerified: { $ne: true } }, { emailVerified: { $exists: false } }],
  });

  const result = await User.updateMany(
    {},
    {
      $set: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    }
  );

  const after = await User.countDocuments({ emailVerified: { $ne: true } });

  console.log("Mark all users as email-verified — done.");
  console.log(`  Users needing verification before: ${before}`);
  console.log(`  Documents matched: ${result.matchedCount}`);
  console.log(`  Documents updated: ${result.modifiedCount}`);
  console.log(`  Still unverified after: ${after}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

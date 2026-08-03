/**
 * Send a test email to confirm Resend settings.
 *
 * Usage: npm run test-email
 * Optional: TEST_EMAIL_TO=you@example.com npm run test-email
 */
import "../src/config/loadEnv";
import {
  verifyEmailConnection,
  sendEmail,
  isEmailConfigured,
  emailSetupHint,
} from "../src/services/emailService";
import {
  buildBrandEmailHtml,
  buildBrandEmailText,
} from "../src/lib/email/brandEmailTemplate";
import { EMAIL_BRAND } from "../src/lib/email/emailConfig";

async function main() {
  const to = process.env.TEST_EMAIL_TO?.trim() || "";

  if (!to) {
    console.error("Set TEST_EMAIL_TO in .env (recipient for the test email)");
    process.exit(1);
  }

  if (!isEmailConfigured()) {
    console.error("Resend is not configured.\n");
    console.error(emailSetupHint());
    process.exit(1);
  }

  const ok = await verifyEmailConnection();
  if (!ok) {
    process.exit(1);
  }

  const content = {
    title: "Resend test email",
    greeting: "Assalamu alaikum,",
    messageBody:
      `This is a test message from ${EMAIL_BRAND.name}. If you received this email, your Resend API key and verified domain are working correctly.`,
    buttonText: "Visit BDOQ Academy",
    buttonLink: EMAIL_BRAND.websiteUrl,
    preheader: "Resend configuration test",
  };

  const result = await sendEmail({
    to,
    subject: `${EMAIL_BRAND.name} — Resend test`,
    text: buildBrandEmailText(content),
    html: buildBrandEmailHtml(content),
  });

  if (result.sent) {
    console.log(`Test email sent to ${to}`);
  } else {
    console.log("Email was not sent (check logs above).");
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Send a test email to confirm SMTP settings.
 *
 * Usage: npm run test-email
 * Optional: TEST_EMAIL_TO=you@example.com npm run test-email
 */
import "../src/config/loadEnv";
import {
  verifySmtpConnection,
  sendEmail,
  isSmtpConfigured,
} from "../src/services/emailService";
import { smtpSetupHint } from "../src/config/smtp";

async function main() {
  const to =
    process.env.TEST_EMAIL_TO?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "";

  if (!to) {
    console.error("Set TEST_EMAIL_TO or SMTP_USER in .env");
    process.exit(1);
  }

  if (!isSmtpConfigured()) {
    console.error("SMTP is not configured.\n");
    console.error(smtpSetupHint());
    process.exit(1);
  }

  const ok = await verifySmtpConnection();
  if (!ok) {
    process.exit(1);
  }

  const result = await sendEmail({
    to,
    subject: "Al Bayaan Academy — SMTP test",
    text: "If you received this, SMTP is working correctly.",
    html: "<p>If you received this, <strong>SMTP is working</strong> for Al Bayaan Academy.</p>",
  });

  if (result.sent) {
    console.log(`Test email sent to ${to}`);
  } else {
    console.log("Email was not sent via SMTP (dev log mode).");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

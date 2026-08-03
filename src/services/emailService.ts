import { EMAIL_BRAND, resolveFromAddress } from "../lib/email/emailConfig";
import {
  buildBrandEmailHtml,
  buildBrandEmailText,
} from "../lib/email/brandEmailTemplate";
import { getResendClient, isResendConfigured } from "../lib/email/resendClient";

function shouldLogEmailToConsole(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.SMTP_DEV_LOG === "true"
  );
}

function logEmailToConsole(
  reason: string,
  options: { to: string; subject: string; text: string }
): void {
  console.log(`\n--- Email (${reason}) ---`);
  console.log(`To: ${options.to}`);
  console.log(`Subject: ${options.subject}`);
  console.log(options.text);
  console.log("---\n");
}

function logSendFailure(err: unknown, from: string): void {
  const msg = err instanceof Error ? err.message : "Unknown error";
  console.warn(`[email] Send failed: ${msg}`);
  if (/domain is not verified|not authorized|403|422/i.test(msg)) {
    console.warn(
      `[email] Resend rejected "${from}". Verify bdonlinequranacademy.com at https://resend.com/domains`
    );
  }
}

export function isEmailConfigured(): boolean {
  return isResendConfigured();
}

/** @deprecated Prefer isEmailConfigured — kept for scripts */
export function isSmtpConfigured(): boolean {
  return isEmailConfigured();
}

export function isEmailVerificationEnforced(): boolean {
  return process.env.REQUIRE_EMAIL_VERIFICATION !== "false";
}

export function emailSetupHint(): string {
  return [
    "Resend SDK email setup:",
    "RESEND_API_KEY=re_... (from https://resend.com/api-keys)",
    "FROM_EMAIL=no-reply@bdonlinequranacademy.com (domain must be verified on Resend)",
    "CLIENT_URL=https://admin.bdonlinequranacademy.com",
    "PUBLIC_SITE_URL=https://www.bdonlinequranacademy.com",
  ].join("\n");
}

/** Call on server start to verify Resend readiness. */
export async function verifyEmailConnection(): Promise<boolean> {
  if (!isResendConfigured()) {
    console.warn(
      "[email] RESEND_API_KEY not configured — auth links will print to the console in development.\n" +
        emailSetupHint()
    );
    return false;
  }

  console.log(`[email] Resend SDK ready (from: ${resolveFromAddress()})`);
  return true;
}

/** @deprecated Use verifyEmailConnection */
export async function verifySmtpConnection(): Promise<boolean> {
  return verifyEmailConnection();
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ sent: boolean; devLogged: boolean; error?: string }> {
  const client = getResendClient();
  const from = resolveFromAddress();
  const logInDev = shouldLogEmailToConsole();

  if (!client) {
    const msg = "RESEND_API_KEY is not configured";
    console.error(`[email] ${msg}`);
    if (logInDev) {
      logEmailToConsole("Resend not configured", options);
    }
    return { sent: false, devLogged: logInDev, error: msg };
  }

  try {
    const { error } = await client.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { sent: true, devLogged: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logSendFailure(err, from);
    console.error(`[email] Failed to send to ${options.to}: ${msg}`);
    if (logInDev) {
      logEmailToConsole("Resend send failed — dev fallback", options);
    }
    return { sent: false, devLogged: logInDev, error: msg };
  }
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationLink: string
): Promise<void> {
  const content = {
    title: "Verify your email address",
    greeting: `Assalamu alaikum ${name},`,
    messageBody:
      `Welcome to ${EMAIL_BRAND.name}. Please confirm your email address to activate your account and access your learning portal.\n\nThis link expires in 24 hours.`,
    buttonText: "Verify my email",
    buttonLink: verificationLink,
    preheader: "Confirm your BDOQ Academy account",
  };

  await sendEmail({
    to: email,
    subject: `Verify your ${EMAIL_BRAND.name} account`,
    text: buildBrandEmailText(content),
    html: buildBrandEmailHtml(content),
  });
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetLink: string
): Promise<{ sent: boolean; error?: string }> {
  const content = {
    title: "Reset your password",
    greeting: `Assalamu alaikum ${name},`,
    messageBody:
      `We received a request to reset your ${EMAIL_BRAND.name} password. Click the button below to choose a new password.\n\nThis link expires in 1 hour. If you did not request a reset, you can safely ignore this email.`,
    buttonText: "Reset my password",
    buttonLink: resetLink,
    preheader: "Password reset request for BDOQ Academy",
  };

  const result = await sendEmail({
    to: email,
    subject: `Reset your ${EMAIL_BRAND.name} password`,
    text: buildBrandEmailText(content),
    html: buildBrandEmailHtml(content),
  });

  return { sent: result.sent, error: result.error };
}

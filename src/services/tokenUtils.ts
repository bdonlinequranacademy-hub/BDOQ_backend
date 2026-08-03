import crypto from "crypto";

const TOKEN_BYTES = 32;
const VERIFICATION_HOURS = 24;
const RESET_HOURS = 1;

export function generateRawToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function verificationExpiry(): Date {
  return new Date(Date.now() + VERIFICATION_HOURS * 60 * 60 * 1000);
}

export function resetExpiry(): Date {
  return new Date(Date.now() + RESET_HOURS * 60 * 60 * 1000);
}

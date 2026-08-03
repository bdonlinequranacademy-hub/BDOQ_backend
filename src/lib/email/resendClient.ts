import { Resend } from "resend";

let cachedClient: Resend | null | undefined;

export function getResendClient(): Resend | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    cachedClient = null;
    return null;
  }

  cachedClient = new Resend(apiKey);
  return cachedClient;
}

export function isResendConfigured(): boolean {
  return getResendClient() !== null;
}

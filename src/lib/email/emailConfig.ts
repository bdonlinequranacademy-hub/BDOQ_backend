export const EMAIL_BRAND = {
  name: "BDOQ Academy",
  legalName: "BD Online Quran Academy",
  primaryColor: "#32C991",
  primaryDark: "#269B6F",
  accentGold: "#D4A853",
  textDark: "#1A1A2E",
  textMuted: "#6B7280",
  background: "#F0FBF6",
  logoUrl: "https://www.bdonlinequranacademy.com/logo.png",
  websiteUrl: "https://www.bdonlinequranacademy.com",
} as const;

export function resolveFromAddress(): string {
  const from =
    process.env.FROM_EMAIL?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    "no-reply@bdonlinequranacademy.com";

  return `${EMAIL_BRAND.name} <${from}>`;
}

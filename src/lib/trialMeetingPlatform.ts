export type TrialMeetingPlatform =
  | "google_meet"
  | "zoom"
  | "teams"
  | "whatsapp"
  | "custom";

export const TRIAL_MEETING_PLATFORMS: TrialMeetingPlatform[] = [
  "google_meet",
  "zoom",
  "teams",
  "whatsapp",
  "custom",
];

const PLATFORM_LABELS: Record<TrialMeetingPlatform, string> = {
  google_meet: "Google Meet",
  zoom: "Zoom",
  teams: "Microsoft Teams",
  whatsapp: "WhatsApp",
  custom: "Custom",
};

export function parseTrialMeetingPlatform(value: unknown): TrialMeetingPlatform | undefined {
  if (typeof value !== "string") return undefined;
  return TRIAL_MEETING_PLATFORMS.includes(value as TrialMeetingPlatform)
    ? (value as TrialMeetingPlatform)
    : undefined;
}

export function formatTrialMeetingPlatform(platform: TrialMeetingPlatform | undefined): string {
  if (!platform) return "Not set";
  return PLATFORM_LABELS[platform] ?? platform;
}

export function normalizeMeetingLink(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(mailto|tel):/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

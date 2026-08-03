export type SmtpProvider = "gmail" | "outlook" | "sendgrid" | "resend" | "custom";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  provider: SmtpProvider | "dev";
}

const PRESETS: Record<
  Exclude<SmtpProvider, "custom">,
  { host: string; port: number; secure: boolean; userHint: string }
> = {
  gmail: {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    userHint: "your.full@gmail.com",
  },
  outlook: {
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    userHint: "your@outlook.com or Microsoft 365 address",
  },
  sendgrid: {
    host: "smtp.sendgrid.net",
    port: 587,
    secure: false,
    userHint: "apikey (literal word)",
  },
  resend: {
    host: "smtp.resend.com",
    port: 587,
    secure: false,
    userHint: "resend",
  },
};

export function resolveSmtpConfig(): SmtpConfig | null {
  const provider = (process.env.SMTP_PROVIDER?.trim().toLowerCase() ||
    "custom") as SmtpProvider;

  const user =
    process.env.SMTP_USER?.trim() ||
    (provider === "resend" ? "resend" : "");

  const pass =
    process.env.SMTP_PASS?.trim() ||
    (provider === "resend" ? process.env.RESEND_API_KEY?.trim() : "");

  if (!pass || !user) {
    return null;
  }

  const preset =
    provider !== "custom" && provider in PRESETS ? PRESETS[provider] : null;

  const host =
    process.env.SMTP_HOST?.trim() || preset?.host || "";
  const port = Number(process.env.SMTP_PORT || preset?.port || 587);
  const secure =
    process.env.SMTP_SECURE === "true" || port === 465 || preset?.secure === true;

  if (!host) {
    return null;
  }

  const from =
    process.env.FROM_EMAIL?.trim() ||
    (provider === "gmail" ? user : "bdonlinequranacademy@gmail.com");

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    provider: preset ? provider : "custom",
  };
}

export function smtpSetupHint(): string {
  const provider = process.env.SMTP_PROVIDER || "custom";
  const preset = PRESETS[provider as Exclude<SmtpProvider, "custom">];
  if (!preset) {
    return "Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and FROM_EMAIL in .env";
  }
  const credentialLine =
    provider === "resend"
      ? "RESEND_API_KEY=re_... (from https://resend.com/api-keys) — then save .env and restart"
      : `SMTP_PASS: app password or API key (see docs/smtp-setup.md)`;
  return [
    `Provider preset: ${provider}`,
    `Host: ${preset.host}:${preset.port}`,
    `SMTP_USER: ${preset.userHint}`,
    credentialLine,
  ].join("\n");
}

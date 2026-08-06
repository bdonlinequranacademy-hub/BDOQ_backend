import { DIAL_CODE_BY_COUNTRY } from "./countryTimezone";

export { DIAL_CODE_BY_COUNTRY };

const SORTED_DIAL_CODES = [...new Set(Object.values(DIAL_CODE_BY_COUNTRY))].sort(
  (a, b) => b.length - a.length
);

export type ParsedWhatsApp = {
  e164: string;
  waMeDigits: string;
  display: string;
};

type ParseResult =
  | { ok: true; value: ParsedWhatsApp }
  | { ok: false; error: string };

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "");
}

function dialCodeForCountry(country?: string): string | undefined {
  if (!country?.trim()) return undefined;
  const trimmed = country.trim();
  if (DIAL_CODE_BY_COUNTRY[trimmed]) return DIAL_CODE_BY_COUNTRY[trimmed];
  const lower = trimmed.toLowerCase();
  const match = Object.entries(DIAL_CODE_BY_COUNTRY).find(
    ([name]) => name.toLowerCase() === lower
  );
  return match?.[1];
}

function detectInternationalDigits(digits: string): string | null {
  for (const code of SORTED_DIAL_CODES) {
    if (digits.startsWith(code) && digits.length > code.length + 6) {
      return digits;
    }
  }
  return null;
}

function formatDisplay(waMeDigits: string): string {
  return `+${waMeDigits.replace(/(\d{2,3})(\d{3,4})(\d+)/, "$1 $2 $3")}`;
}

function validateLength(waMeDigits: string): string | null {
  if (waMeDigits.length < 10 || waMeDigits.length > 15) {
    return "WhatsApp number must be 10–15 digits including country code.";
  }
  if (waMeDigits.startsWith("0")) {
    return "Number cannot start with 0 after adding country code.";
  }
  return null;
}

/**
 * Normalize a WhatsApp number to E.164 / wa.me digits.
 * @param raw User input e.g. 01712-345678 or +44 7123 456789
 * @param countryHint Profile country e.g. Bangladesh — used when no + prefix
 */
export function parseWhatsApp(raw: string, countryHint?: string): ParseResult {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) {
    return { ok: false, error: "WhatsApp number is required." };
  }

  let digits = digitsOnly(trimmed);
  if (!digits) {
    return { ok: false, error: "Enter a valid phone number." };
  }

  const hasPlus = trimmed.startsWith("+");
  let waMeDigits: string | null = null;

  if (hasPlus || detectInternationalDigits(digits)) {
    waMeDigits = detectInternationalDigits(digits) ?? digits;
  } else {
    const dial = dialCodeForCountry(countryHint);
    if (!dial) {
      return {
        ok: false,
        error:
          "Include country code (e.g. +880…) or set your country on your profile first.",
      };
    }

    let local = digits;
    if (local.startsWith("0")) local = local.slice(1);

    if (local.startsWith(dial)) {
      waMeDigits = local;
    } else {
      waMeDigits = `${dial}${local}`;
    }
  }

  const lengthError = validateLength(waMeDigits);
  if (lengthError) {
    return { ok: false, error: lengthError };
  }

  const parsed: ParsedWhatsApp = {
    e164: `+${waMeDigits}`,
    waMeDigits,
    display: formatDisplay(waMeDigits),
  };
  return { ok: true, value: parsed };
}

export function buildWaMeUrl(waMeDigits: string, message?: string): string {
  const base = `https://wa.me/${waMeDigits}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

export function waMeUrlFromRaw(
  raw: string,
  countryHint?: string,
  message?: string
): string | null {
  const parsed = parseWhatsApp(raw, countryHint);
  if (!parsed.ok) return null;
  return buildWaMeUrl(parsed.value.waMeDigits, message);
}

/** Store E.164 in database; empty string clears the field. */
export function normalizeWhatsAppForStorage(
  raw: unknown,
  countryHint?: string
): { ok: true; whatsapp: string } | { ok: false; error: string } {
  if (raw === undefined || raw === null) {
    return { ok: true, whatsapp: "" };
  }
  if (typeof raw !== "string") {
    return { ok: false, error: "WhatsApp must be a text value." };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, whatsapp: "" };
  }

  const parsed = parseWhatsApp(trimmed, countryHint);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  return { ok: true, whatsapp: parsed.value.e164 };
}

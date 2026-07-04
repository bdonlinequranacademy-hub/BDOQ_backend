/** Country name → international dial code (no +). */
export const DIAL_CODE_BY_COUNTRY: Record<string, string> = {
  Bangladesh: "880",
  "United States": "1",
  "United Kingdom": "44",
  Canada: "1",
  Australia: "61",
  "Saudi Arabia": "966",
  UAE: "971",
  "United Arab Emirates": "971",
  Qatar: "974",
  Kuwait: "965",
  Malaysia: "60",
  Singapore: "65",
  Indonesia: "62",
  Pakistan: "92",
  India: "91",
  Egypt: "20",
  Turkey: "90",
  Germany: "49",
  France: "33",
  Italy: "39",
  Spain: "34",
  Netherlands: "31",
  Sweden: "46",
  Norway: "47",
  Japan: "81",
  "South Korea": "82",
  China: "86",
  "New Zealand": "64",
  Ireland: "353",
  Belgium: "32",
  Switzerland: "41",
  Oman: "968",
  Bahrain: "973",
  Jordan: "962",
  Morocco: "212",
  Nigeria: "234",
  Kenya: "254",
  "South Africa": "27",
};

const SORTED_DIAL_CODES = [...new Set(Object.values(DIAL_CODE_BY_COUNTRY))].sort(
  (a, b) => b.length - a.length
);

export type ParsedWhatsApp = {
  e164: string;
  waMeDigits: string;
  display: string;
};

export type ParseWhatsAppResult =
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
export function parseWhatsApp(
  raw: string,
  countryHint?: string
): ParseWhatsAppResult {
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

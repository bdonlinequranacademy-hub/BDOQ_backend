/** Normalize stored meeting URLs so clients never treat them as site-relative paths. */
export function normalizeMeetingLink(raw?: string | null): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(mailto|tel):/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export class GeminiQuotaError extends Error {
  constructor(message = "Daily AI limit reached. Please try again later.") {
    super(message);
    this.name = "GeminiQuotaError";
  }
}

export function isQuotaError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("429") ||
    lower.includes("resource_exhausted") ||
    lower.includes("quota") ||
    lower.includes("rate limit")
  );
}

export function toGeminiError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (isQuotaError(message)) {
    return new GeminiQuotaError();
  }
  return error instanceof Error ? error : new Error(message);
}

export function aiErrorStatus(error: unknown): number {
  return error instanceof GeminiQuotaError ? 429 : 500;
}

export function aiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof GeminiQuotaError) {
    return error.message;
  }
  return fallback;
}

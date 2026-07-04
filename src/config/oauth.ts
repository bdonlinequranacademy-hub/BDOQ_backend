function isConfigured(value: string | undefined): boolean {
  return Boolean(value?.trim() && !value.toLowerCase().includes("comming"));
}

export function isGoogleOAuthConfigured(): boolean {
  return (
    isConfigured(process.env.GOOGLE_CLIENT_ID) &&
    isConfigured(process.env.GOOGLE_CLIENT_SECRET)
  );
}

/** Public API base — used for OAuth callback URLs (no trailing slash). */
export function getOAuthCallbackBase(): string {
  const port = process.env.PORT || "5000";
  return (process.env.API_BASE_URL || `http://localhost:${port}`).replace(/\/$/, "");
}

export function getGoogleOAuthCallbackUrl(): string {
  return `${getOAuthCallbackBase()}/api/auth/google/callback`;
}

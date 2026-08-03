import type { Request } from "express";

export type AuthAppTarget = "portal" | "public";

const PORTAL_FALLBACK = "https://myacademy.bdonlinequranacademy.com";
const PUBLIC_FALLBACK = "https://bdonlinequranacademy.com";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

export function getPortalBaseUrl(): string {
  return stripTrailingSlash(process.env.CLIENT_URL?.trim() || PORTAL_FALLBACK);
}

export function getPublicSiteBaseUrl(): string {
  return stripTrailingSlash(process.env.PUBLIC_SITE_URL?.trim() || PUBLIC_FALLBACK);
}

function hostnameFromUrl(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function matchesHost(candidate: string, allowedHosts: string[]): boolean {
  const host = hostnameFromUrl(candidate);
  if (!host) return false;
  return allowedHosts.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`)
  );
}

function portalHosts(): string[] {
  const hosts = new Set<string>([
    "myacademy.bdonlinequranacademy.com",
    "admin.bdonlinequranacademy.com",
    "bdoq-academy-portal.vercel.app",
    "localhost",
    "127.0.0.1",
  ]);
  const portalHost = hostnameFromUrl(getPortalBaseUrl());
  if (portalHost) hosts.add(portalHost);
  return [...hosts];
}

function publicHosts(): string[] {
  const hosts = new Set<string>([
    "www.bdonlinequranacademy.com",
    "bdonlinequranacademy.com",
    "bdoq-public-site-a42c.vercel.app",
    "localhost",
    "127.0.0.1",
  ]);
  const publicHost = hostnameFromUrl(getPublicSiteBaseUrl());
  if (publicHost) hosts.add(publicHost);
  return [...hosts];
}

function resolveFromHeaderOrigin(origin: string | undefined): AuthAppTarget | null {
  if (!origin) return null;
  if (matchesHost(origin, portalHosts())) return "portal";
  if (matchesHost(origin, publicHosts())) return "public";
  return null;
}

function parseBodyTarget(body: unknown): AuthAppTarget | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const raw =
    record.appOrigin ??
    record.appTarget ??
    record.clientOrigin ??
    record.origin;

  if (raw === "portal" || raw === "public") return raw;
  if (raw === "admin" || raw === "portal-app") return "portal";
  if (raw === "website" || raw === "public-site") return "public";
  return null;
}

function parseExplicitBaseUrl(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const raw = record.clientBaseUrl ?? record.baseUrl ?? record.redirectBaseUrl;
  if (typeof raw !== "string" || !raw.trim()) return null;

  const normalized = stripTrailingSlash(raw.trim());
  if (matchesHost(normalized, portalHosts())) return getPortalBaseUrl();
  if (matchesHost(normalized, publicHosts())) return getPublicSiteBaseUrl();
  return null;
}

/**
 * Resolves which frontend should receive auth links (verify email, reset password).
 * Priority: explicit base URL → body appOrigin → Origin/Referer header → default target.
 */
export function resolveAuthBaseUrl(
  req: Request,
  defaultTarget: AuthAppTarget = "portal"
): string {
  const explicit = parseExplicitBaseUrl(req.body);
  if (explicit) return explicit;

  const bodyTarget = parseBodyTarget(req.body);
  if (bodyTarget === "portal") return getPortalBaseUrl();
  if (bodyTarget === "public") return getPublicSiteBaseUrl();

  const headerOrigin =
    (typeof req.headers.origin === "string" ? req.headers.origin : undefined) ||
    (typeof req.headers.referer === "string" ? req.headers.referer : undefined);

  const headerTarget = resolveFromHeaderOrigin(headerOrigin);
  if (headerTarget === "portal") return getPortalBaseUrl();
  if (headerTarget === "public") return getPublicSiteBaseUrl();

  return defaultTarget === "public" ? getPublicSiteBaseUrl() : getPortalBaseUrl();
}

/** @deprecated Use getPortalBaseUrl() — kept for existing imports */
export function portalBaseUrl(): string {
  return getPortalBaseUrl();
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPortalBaseUrl = getPortalBaseUrl;
exports.getPublicSiteBaseUrl = getPublicSiteBaseUrl;
exports.resolveAuthBaseUrl = resolveAuthBaseUrl;
exports.portalBaseUrl = portalBaseUrl;
const PORTAL_FALLBACK = "https://myacademy.bdonlinequranacademy.com";
const PUBLIC_FALLBACK = "https://bdonlinequranacademy.com";
function stripTrailingSlash(url) {
    return url.replace(/\/$/, "");
}
function getPortalBaseUrl() {
    return stripTrailingSlash(process.env.CLIENT_URL?.trim() || PORTAL_FALLBACK);
}
function getPublicSiteBaseUrl() {
    return stripTrailingSlash(process.env.PUBLIC_SITE_URL?.trim() || PUBLIC_FALLBACK);
}
function hostnameFromUrl(value) {
    try {
        return new URL(value).hostname.toLowerCase();
    }
    catch {
        return null;
    }
}
function matchesHost(candidate, allowedHosts) {
    const host = hostnameFromUrl(candidate);
    if (!host)
        return false;
    return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}
function portalHosts() {
    const hosts = new Set([
        "myacademy.bdonlinequranacademy.com",
        "admin.bdonlinequranacademy.com",
        "bdoq-academy-portal.vercel.app",
        "localhost",
        "127.0.0.1",
    ]);
    const portalHost = hostnameFromUrl(getPortalBaseUrl());
    if (portalHost)
        hosts.add(portalHost);
    return [...hosts];
}
function publicHosts() {
    const hosts = new Set([
        "www.bdonlinequranacademy.com",
        "bdonlinequranacademy.com",
        "bdoq-public-site-a42c.vercel.app",
        "localhost",
        "127.0.0.1",
    ]);
    const publicHost = hostnameFromUrl(getPublicSiteBaseUrl());
    if (publicHost)
        hosts.add(publicHost);
    return [...hosts];
}
function resolveFromHeaderOrigin(origin) {
    if (!origin)
        return null;
    if (matchesHost(origin, portalHosts()))
        return "portal";
    if (matchesHost(origin, publicHosts()))
        return "public";
    return null;
}
function parseBodyTarget(body) {
    if (!body || typeof body !== "object")
        return null;
    const record = body;
    const raw = record.appOrigin ??
        record.appTarget ??
        record.clientOrigin ??
        record.origin;
    if (raw === "portal" || raw === "public")
        return raw;
    if (raw === "admin" || raw === "portal-app")
        return "portal";
    if (raw === "website" || raw === "public-site")
        return "public";
    return null;
}
function parseExplicitBaseUrl(body) {
    if (!body || typeof body !== "object")
        return null;
    const record = body;
    const raw = record.clientBaseUrl ?? record.baseUrl ?? record.redirectBaseUrl;
    if (typeof raw !== "string" || !raw.trim())
        return null;
    const normalized = stripTrailingSlash(raw.trim());
    if (matchesHost(normalized, portalHosts()))
        return getPortalBaseUrl();
    if (matchesHost(normalized, publicHosts()))
        return getPublicSiteBaseUrl();
    return null;
}
/**
 * Resolves which frontend should receive auth links (verify email, reset password).
 * Priority: explicit base URL → body appOrigin → Origin/Referer header → default target.
 */
function resolveAuthBaseUrl(req, defaultTarget = "portal") {
    const explicit = parseExplicitBaseUrl(req.body);
    if (explicit)
        return explicit;
    const bodyTarget = parseBodyTarget(req.body);
    if (bodyTarget === "portal")
        return getPortalBaseUrl();
    if (bodyTarget === "public")
        return getPublicSiteBaseUrl();
    const headerOrigin = (typeof req.headers.origin === "string" ? req.headers.origin : undefined) ||
        (typeof req.headers.referer === "string" ? req.headers.referer : undefined);
    const headerTarget = resolveFromHeaderOrigin(headerOrigin);
    if (headerTarget === "portal")
        return getPortalBaseUrl();
    if (headerTarget === "public")
        return getPublicSiteBaseUrl();
    return defaultTarget === "public" ? getPublicSiteBaseUrl() : getPortalBaseUrl();
}
/** @deprecated Use getPortalBaseUrl() — kept for existing imports */
function portalBaseUrl() {
    return getPortalBaseUrl();
}

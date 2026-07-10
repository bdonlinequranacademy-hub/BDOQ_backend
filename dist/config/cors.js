"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCorsDisabled = isCorsDisabled;
exports.getAllowedOrigins = getAllowedOrigins;
exports.isOriginAllowed = isOriginAllowed;
exports.createCorsOptions = createCorsOptions;
function parseOriginList(raw) {
    if (!raw?.trim())
        return [];
    return raw
        .split(",")
        .map((value) => value.trim().replace(/\/$/, ""))
        .filter(Boolean);
}
function normalizeOrigin(origin) {
    return origin.replace(/\/$/, "");
}
/**
 * Vercel preview URLs share a project slug prefix, e.g.
 * production: https://bdoq-academy-portal.vercel.app
 * preview:    https://bdoq-academy-portal-ozv7ulcm6-mohibullahs-projects.vercel.app
 */
function matchesVercelDeployment(origin, configuredUrl) {
    if (!configuredUrl)
        return false;
    try {
        const configuredHost = new URL(configuredUrl).hostname;
        if (!configuredHost.endsWith(".vercel.app"))
            return false;
        const originHost = new URL(origin).hostname;
        if (!originHost.endsWith(".vercel.app"))
            return false;
        const projectPrefix = configuredHost.replace(/\.vercel\.app$/, "");
        const originPrefix = originHost.replace(/\.vercel\.app$/, "");
        return originPrefix === projectPrefix || originPrefix.startsWith(`${projectPrefix}-`);
    }
    catch {
        return false;
    }
}
/** When true, all browser origins may call the API (local dev only). */
function isCorsDisabled() {
    const raw = process.env.CORS_DISABLED?.trim().toLowerCase();
    return raw === "true" || raw === "1" || raw === "yes";
}
/** Browser origins allowed to call the API (portal, marketing site, etc.). */
function getAllowedOrigins() {
    const defaults = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:4321",
    ];
    const fromEnv = parseOriginList(process.env.CORS_ORIGINS);
    const clientUrl = process.env.CLIENT_URL?.trim().replace(/\/$/, "");
    const publicSite = process.env.PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
    const merged = [...defaults, ...fromEnv];
    if (clientUrl)
        merged.push(clientUrl);
    if (publicSite)
        merged.push(publicSite);
    return [...new Set(merged)];
}
function isOriginAllowed(origin) {
    const normalized = normalizeOrigin(origin);
    const allowed = getAllowedOrigins();
    if (allowed.includes(normalized))
        return true;
    const clientUrl = process.env.CLIENT_URL?.trim().replace(/\/$/, "");
    const publicSite = process.env.PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
    if (matchesVercelDeployment(normalized, clientUrl))
        return true;
    if (matchesVercelDeployment(normalized, publicSite))
        return true;
    return false;
}
function createCorsOptions() {
    if (isCorsDisabled()) {
        return {
            origin: true,
            credentials: true,
        };
    }
    return {
        origin(origin, callback) {
            // Same-origin / server-to-server / curl
            if (!origin) {
                callback(null, true);
                return;
            }
            if (isOriginAllowed(origin)) {
                callback(null, true);
                return;
            }
            callback(null, false);
        },
        credentials: true,
    };
}

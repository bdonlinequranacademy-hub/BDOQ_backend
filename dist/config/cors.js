"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllowedOrigins = getAllowedOrigins;
exports.createCorsOptions = createCorsOptions;
function parseOriginList(raw) {
    if (!raw?.trim())
        return [];
    return raw
        .split(",")
        .map((value) => value.trim().replace(/\/$/, ""))
        .filter(Boolean);
}
/** Browser origins allowed to call the API (portal, marketing site, etc.). */
function getAllowedOrigins() {
    const defaults = [
        "http://localhost:5173",
        "http://localhost:5174",
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
function createCorsOptions() {
    const allowed = getAllowedOrigins();
    return {
        origin(origin, callback) {
            // Same-origin / server-to-server / curl
            if (!origin) {
                callback(null, true);
                return;
            }
            const normalized = origin.replace(/\/$/, "");
            if (allowed.includes(normalized)) {
                callback(null, true);
                return;
            }
            callback(null, false);
        },
        credentials: true,
    };
}

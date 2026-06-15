"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthAccountRequiredError = exports.OAuthPortalMismatchError = void 0;
exports.parsePortalIntent = parsePortalIntent;
exports.roleMatchesPortal = roleMatchesPortal;
const PORTAL_INTENTS = ["student", "teacher", "admin"];
function parsePortalIntent(value) {
    if (typeof value === "string" && PORTAL_INTENTS.includes(value)) {
        return value;
    }
    return "student";
}
function roleMatchesPortal(userRole, portal) {
    if (portal === "student")
        return userRole === "student" || userRole === "parent";
    if (portal === "admin")
        return userRole === "admin" || userRole === "super_admin";
    return userRole === portal;
}
class OAuthPortalMismatchError extends Error {
    constructor(portal, userRole) {
        super("OAUTH_PORTAL_MISMATCH");
        this.portal = portal;
        this.userRole = userRole;
        this.name = "OAuthPortalMismatchError";
    }
}
exports.OAuthPortalMismatchError = OAuthPortalMismatchError;
class OAuthAccountRequiredError extends Error {
    constructor(portal) {
        super("OAUTH_ACCOUNT_REQUIRED");
        this.portal = portal;
        this.name = "OAuthAccountRequiredError";
    }
}
exports.OAuthAccountRequiredError = OAuthAccountRequiredError;

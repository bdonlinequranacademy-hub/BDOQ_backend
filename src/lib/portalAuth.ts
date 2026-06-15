import type { IUser } from "../models/User";

export type PortalIntent = "student" | "teacher" | "admin";

const PORTAL_INTENTS: PortalIntent[] = ["student", "teacher", "admin"];

export function parsePortalIntent(value: unknown): PortalIntent {
  if (typeof value === "string" && PORTAL_INTENTS.includes(value as PortalIntent)) {
    return value as PortalIntent;
  }
  return "student";
}

export function roleMatchesPortal(userRole: IUser["role"], portal: PortalIntent): boolean {
  if (portal === "student") return userRole === "student" || userRole === "parent";
  if (portal === "admin") return userRole === "admin" || userRole === "super_admin";
  return userRole === portal;
}

export class OAuthPortalMismatchError extends Error {
  constructor(
    public readonly portal: PortalIntent,
    public readonly userRole: IUser["role"]
  ) {
    super("OAUTH_PORTAL_MISMATCH");
    this.name = "OAuthPortalMismatchError";
  }
}

export class OAuthAccountRequiredError extends Error {
  constructor(public readonly portal: PortalIntent) {
    super("OAUTH_ACCOUNT_REQUIRED");
    this.name = "OAuthAccountRequiredError";
  }
}

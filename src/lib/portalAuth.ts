import type { IUser } from "../models/User";

/** @deprecated URL portal roles removed — login routes by account role */
export type PortalIntent = "student" | "teacher" | "admin";

export function parsePortalIntent(_value: unknown): PortalIntent {
  return "student";
}

export function roleMatchesPortal(_userRole: IUser["role"], _portal: PortalIntent): boolean {
  return true;
}

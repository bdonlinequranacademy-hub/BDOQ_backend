import type { IUser, UserRole } from "../models/User";

export const SUPER_ADMIN_ROLE = "super_admin" as const;
export const STAFF_ADMIN_ROLE = "admin" as const;

export const ELEVATED_ROLES: UserRole[] = ["admin", "super_admin"];

export const SUPER_ADMIN_ASSIGNABLE_ROLES: UserRole[] = [
  "student",
  "teacher",
  "admin",
];

export const STAFF_ADMIN_ASSIGNABLE_ROLES: UserRole[] = ["student", "teacher"];

export function isStaffAdmin(role: UserRole): boolean {
  return role === "admin" || role === "super_admin";
}

export function isSuperAdmin(role: UserRole): boolean {
  return role === "super_admin";
}

export function isElevatedAccount(role: UserRole): boolean {
  return role === "admin" || role === "super_admin";
}

export function assignableRolesFor(actor: IUser): UserRole[] {
  return isSuperAdmin(actor.role)
    ? SUPER_ADMIN_ASSIGNABLE_ROLES
    : STAFF_ADMIN_ASSIGNABLE_ROLES;
}

export function canManageUser(actor: IUser, target: IUser): boolean {
  if (isSuperAdmin(actor.role)) {
    return target.role !== "super_admin" || actor._id.equals(target._id);
  }
  return !isElevatedAccount(target.role);
}

export function canAssignRole(actor: IUser, nextRole: UserRole): boolean {
  return assignableRolesFor(actor).includes(nextRole);
}

export function usersListFilterFor(actor: IUser): Record<string, unknown> {
  if (isSuperAdmin(actor.role)) return {};
  return { role: { $ne: "super_admin" } };
}

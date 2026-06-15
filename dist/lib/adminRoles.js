"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STAFF_ADMIN_ASSIGNABLE_ROLES = exports.SUPER_ADMIN_ASSIGNABLE_ROLES = exports.ELEVATED_ROLES = exports.STAFF_ADMIN_ROLE = exports.SUPER_ADMIN_ROLE = void 0;
exports.isStaffAdmin = isStaffAdmin;
exports.isSuperAdmin = isSuperAdmin;
exports.isElevatedAccount = isElevatedAccount;
exports.assignableRolesFor = assignableRolesFor;
exports.canManageUser = canManageUser;
exports.canAssignRole = canAssignRole;
exports.usersListFilterFor = usersListFilterFor;
exports.SUPER_ADMIN_ROLE = "super_admin";
exports.STAFF_ADMIN_ROLE = "admin";
exports.ELEVATED_ROLES = ["admin", "super_admin"];
exports.SUPER_ADMIN_ASSIGNABLE_ROLES = [
    "student",
    "teacher",
    "admin",
];
exports.STAFF_ADMIN_ASSIGNABLE_ROLES = ["student", "teacher"];
function isStaffAdmin(role) {
    return role === "admin" || role === "super_admin";
}
function isSuperAdmin(role) {
    return role === "super_admin";
}
function isElevatedAccount(role) {
    return role === "admin" || role === "super_admin";
}
function assignableRolesFor(actor) {
    return isSuperAdmin(actor.role)
        ? exports.SUPER_ADMIN_ASSIGNABLE_ROLES
        : exports.STAFF_ADMIN_ASSIGNABLE_ROLES;
}
function canManageUser(actor, target) {
    if (isSuperAdmin(actor.role)) {
        return target.role !== "super_admin" || actor._id.equals(target._id);
    }
    return !isElevatedAccount(target.role);
}
function canAssignRole(actor, nextRole) {
    return assignableRolesFor(actor).includes(nextRole);
}
function usersListFilterFor(actor) {
    if (isSuperAdmin(actor.role))
        return {};
    return { role: { $ne: "super_admin" } };
}

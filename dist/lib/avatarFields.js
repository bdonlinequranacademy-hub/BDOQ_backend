"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.avatarFieldsFromUser = avatarFieldsFromUser;
function avatarFieldsFromUser(user) {
    return { avatarUrl: user.avatarUrl?.trim() || "" };
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugifyTitle = slugifyTitle;
function slugifyTitle(title) {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractParentInfoFromFormData = extractParentInfoFromFormData;
function extractParentInfoFromFormData(formData) {
    if (!formData)
        return undefined;
    const name = typeof formData.parentName === "string" ? formData.parentName.trim() : "";
    const relationship = typeof formData.parentRelationship === "string"
        ? formData.parentRelationship.trim()
        : "";
    const whatsapp = typeof formData.parentWhatsapp === "string"
        ? formData.parentWhatsapp.trim()
        : "";
    const email = typeof formData.parentEmail === "string" ? formData.parentEmail.trim() : "";
    if (!name && !relationship && !whatsapp && !email) {
        return undefined;
    }
    return {
        ...(name ? { name } : {}),
        ...(relationship ? { relationship } : {}),
        ...(whatsapp ? { whatsapp } : {}),
        ...(email ? { email } : {}),
    };
}

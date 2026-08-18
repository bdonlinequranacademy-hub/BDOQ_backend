"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCloudinaryAsset = deleteCloudinaryAsset;
exports.uploadUserAvatar = uploadUserAvatar;
exports.uploadOptionalPaymentProof = uploadOptionalPaymentProof;
exports.uploadPaymentProof = uploadPaymentProof;
exports.uploadApplicationFile = uploadApplicationFile;
exports.toSignedMediaUrl = toSignedMediaUrl;
exports.uploadResourceMedia = uploadResourceMedia;
const cloudinary_1 = require("../config/cloudinary");
(0, cloudinary_1.configureCloudinary)();
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PDF_MAX_BYTES = 10 * 1024 * 1024;
const MAX_BYTES = IMAGE_MAX_BYTES;
function isPdfUpload(mimeType, originalName) {
    const name = (originalName ?? "").toLowerCase();
    return (mimeType === "application/pdf" ||
        mimeType === "application/x-pdf" ||
        name.endsWith(".pdf"));
}
async function deleteCloudinaryAsset(publicId) {
    if (!(0, cloudinary_1.isCloudinaryConfigured)() || !publicId.trim())
        return;
    await cloudinary_1.cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}
async function uploadUserAvatar(buffer, userId, mimeType) {
    if (!(0, cloudinary_1.isCloudinaryConfigured)()) {
        throw new Error("CLOUDINARY_NOT_CONFIGURED");
    }
    if (buffer.length > MAX_BYTES) {
        throw new Error("FILE_TOO_LARGE");
    }
    const folder = `bdoq-academy/avatars/users/${userId}`;
    const result = await cloudinary_1.cloudinary.uploader.upload(`data:${mimeType};base64,${buffer.toString("base64")}`, {
        folder,
        resource_type: "image",
        overwrite: true,
        unique_filename: true,
        transformation: [{ width: 512, height: 512, crop: "fill", gravity: "face" }],
    });
    return {
        url: result.secure_url,
        publicId: result.public_id,
    };
}
async function uploadOptionalPaymentProof(buffer, folderKey, mimeType) {
    if (!(0, cloudinary_1.isCloudinaryConfigured)()) {
        throw new Error("CLOUDINARY_NOT_CONFIGURED");
    }
    if (buffer.length > MAX_BYTES) {
        throw new Error("FILE_TOO_LARGE");
    }
    const safeKey = folderKey.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || "public";
    const folder = `bdoq-academy/optional-payments/${safeKey}`;
    const result = await cloudinary_1.cloudinary.uploader.upload(`data:${mimeType};base64,${buffer.toString("base64")}`, {
        folder,
        resource_type: "image",
        overwrite: false,
        unique_filename: true,
    });
    return {
        url: result.secure_url,
        publicId: result.public_id,
    };
}
async function uploadPaymentProof(buffer, studentId, mimeType) {
    if (!(0, cloudinary_1.isCloudinaryConfigured)()) {
        throw new Error("CLOUDINARY_NOT_CONFIGURED");
    }
    if (buffer.length > MAX_BYTES) {
        throw new Error("FILE_TOO_LARGE");
    }
    const folder = `myacademy/payments/${studentId}`;
    const result = await cloudinary_1.cloudinary.uploader.upload(`data:${mimeType};base64,${buffer.toString("base64")}`, {
        folder,
        resource_type: "image",
        overwrite: false,
        unique_filename: true,
    });
    return {
        url: result.secure_url,
        publicId: result.public_id,
    };
}
async function uploadApplicationFile(buffer, folder, mimeType, resourceType = "image", originalName) {
    if (!(0, cloudinary_1.isCloudinaryConfigured)()) {
        throw new Error("CLOUDINARY_NOT_CONFIGURED");
    }
    const pdf = isPdfUpload(mimeType, originalName);
    const maxBytes = pdf ? PDF_MAX_BYTES : IMAGE_MAX_BYTES;
    if (buffer.length > maxBytes) {
        throw new Error("FILE_TOO_LARGE");
    }
    const result = await cloudinary_1.cloudinary.uploader.upload(`data:${mimeType};base64,${buffer.toString("base64")}`, pdf
        ? {
            folder: `boq-academy/${folder}`,
            resource_type: "raw",
            format: "pdf",
            overwrite: false,
            unique_filename: true,
        }
        : {
            folder: `boq-academy/${folder}`,
            resource_type: mimeType.startsWith("image/") ? "image" : resourceType,
            overwrite: false,
            unique_filename: true,
        });
    return {
        url: result.secure_url,
        publicId: result.public_id,
    };
}
function extractCloudinaryPublicId(url) {
    try {
        const parsed = new URL(url);
        const match = parsed.pathname.match(/\/(?:image|raw|video)\/upload\/(?:v\d+\/)?(.+)$/);
        if (!match?.[1])
            return null;
        return decodeURIComponent(match[1]).replace(/\.[a-z0-9]+$/i, "");
    }
    catch {
        return null;
    }
}
function toSignedMediaUrl(url, publicId) {
    if (!url)
        return url;
    const lower = url.toLowerCase();
    const looksPdf = lower.includes(".pdf") ||
        lower.includes("/raw/upload/") ||
        lower.includes("f_pdf");
    if (!looksPdf)
        return url;
    if (!(0, cloudinary_1.isCloudinaryConfigured)())
        return url;
    const id = (publicId?.trim() || extractCloudinaryPublicId(url) || "").replace(/\.[a-z0-9]+$/i, "");
    if (!id)
        return url;
    const resourceType = url.includes("/raw/upload/") ? "raw" : "image";
    try {
        return cloudinary_1.cloudinary.url(id, {
            resource_type: resourceType,
            type: "upload",
            sign_url: true,
            secure: true,
            ...(resourceType === "image" ? { format: "pdf" } : {}),
        });
    }
    catch {
        return url;
    }
}
const MAX_IMAGE_RESOURCE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_RESOURCE_BYTES = 100 * 1024 * 1024;
async function uploadResourceMedia(buffer, folder, mimeType, resourceType = "raw") {
    if (!(0, cloudinary_1.isCloudinaryConfigured)()) {
        throw new Error("CLOUDINARY_NOT_CONFIGURED");
    }
    const maxBytes = resourceType === "video" ? MAX_VIDEO_RESOURCE_BYTES : MAX_IMAGE_RESOURCE_BYTES;
    if (buffer.length > maxBytes) {
        throw new Error("FILE_TOO_LARGE");
    }
    const result = await cloudinary_1.cloudinary.uploader.upload(`data:${mimeType};base64,${buffer.toString("base64")}`, {
        folder: `boq-academy/resources/${folder}`,
        resource_type: resourceType,
        overwrite: false,
        unique_filename: true,
    });
    return {
        url: result.secure_url,
        publicId: result.public_id,
    };
}

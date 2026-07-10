"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCloudinaryAsset = deleteCloudinaryAsset;
exports.uploadUserAvatar = uploadUserAvatar;
exports.uploadPaymentProof = uploadPaymentProof;
exports.uploadApplicationFile = uploadApplicationFile;
exports.uploadResourceMedia = uploadResourceMedia;
const cloudinary_1 = require("../config/cloudinary");
(0, cloudinary_1.configureCloudinary)();
const MAX_BYTES = 5 * 1024 * 1024;
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
async function uploadApplicationFile(buffer, folder, mimeType, resourceType = "image") {
    if (!(0, cloudinary_1.isCloudinaryConfigured)()) {
        throw new Error("CLOUDINARY_NOT_CONFIGURED");
    }
    if (buffer.length > MAX_BYTES) {
        throw new Error("FILE_TOO_LARGE");
    }
    const result = await cloudinary_1.cloudinary.uploader.upload(`data:${mimeType};base64,${buffer.toString("base64")}`, {
        folder: `boq-academy/${folder}`,
        resource_type: resourceType,
        overwrite: false,
        unique_filename: true,
    });
    return {
        url: result.secure_url,
        publicId: result.public_id,
    };
}
const MAX_RESOURCE_BYTES = 15 * 1024 * 1024;
async function uploadResourceMedia(buffer, folder, mimeType, resourceType = "raw") {
    if (!(0, cloudinary_1.isCloudinaryConfigured)()) {
        throw new Error("CLOUDINARY_NOT_CONFIGURED");
    }
    if (buffer.length > MAX_RESOURCE_BYTES) {
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

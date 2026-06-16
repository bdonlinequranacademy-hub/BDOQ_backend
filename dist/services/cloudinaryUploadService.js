"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadPaymentProof = uploadPaymentProof;
const cloudinary_1 = require("../config/cloudinary");
(0, cloudinary_1.configureCloudinary)();
const MAX_BYTES = 5 * 1024 * 1024;
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

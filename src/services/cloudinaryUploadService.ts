import { cloudinary, configureCloudinary, isCloudinaryConfigured } from "../config/cloudinary";

configureCloudinary();

const MAX_BYTES = 5 * 1024 * 1024;

export async function deleteCloudinaryAsset(publicId: string): Promise<void> {
  if (!isCloudinaryConfigured() || !publicId.trim()) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}

export async function uploadUserAvatar(
  buffer: Buffer,
  userId: string,
  mimeType: string
): Promise<{ url: string; publicId: string }> {
  if (!isCloudinaryConfigured()) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }

  if (buffer.length > MAX_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const folder = `bdoq-academy/avatars/users/${userId}`;

  const result = await cloudinary.uploader.upload(
    `data:${mimeType};base64,${buffer.toString("base64")}`,
    {
      folder,
      resource_type: "image",
      overwrite: true,
      unique_filename: true,
      transformation: [{ width: 512, height: 512, crop: "fill", gravity: "face" }],
    }
  );

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

export async function uploadPaymentProof(
  buffer: Buffer,
  studentId: string,
  mimeType: string
): Promise<{ url: string; publicId: string }> {
  if (!isCloudinaryConfigured()) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }

  if (buffer.length > MAX_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const folder = `myacademy/payments/${studentId}`;

  const result = await cloudinary.uploader.upload(
    `data:${mimeType};base64,${buffer.toString("base64")}`,
    {
      folder,
      resource_type: "image",
      overwrite: false,
      unique_filename: true,
    }
  );

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

export async function uploadApplicationFile(
  buffer: Buffer,
  folder: string,
  mimeType: string,
  resourceType: "image" | "raw" = "image"
): Promise<{ url: string; publicId: string }> {
  if (!isCloudinaryConfigured()) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }

  if (buffer.length > MAX_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const result = await cloudinary.uploader.upload(
    `data:${mimeType};base64,${buffer.toString("base64")}`,
    {
      folder: `boq-academy/${folder}`,
      resource_type: resourceType,
      overwrite: false,
      unique_filename: true,
    }
  );

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

const MAX_RESOURCE_BYTES = 15 * 1024 * 1024;

export async function uploadResourceMedia(
  buffer: Buffer,
  folder: string,
  mimeType: string,
  resourceType: "image" | "raw" | "video" = "raw"
): Promise<{ url: string; publicId: string }> {
  if (!isCloudinaryConfigured()) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }

  if (buffer.length > MAX_RESOURCE_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const result = await cloudinary.uploader.upload(
    `data:${mimeType};base64,${buffer.toString("base64")}`,
    {
      folder: `boq-academy/resources/${folder}`,
      resource_type: resourceType,
      overwrite: false,
      unique_filename: true,
    }
  );

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

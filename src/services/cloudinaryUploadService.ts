import { cloudinary, configureCloudinary, isCloudinaryConfigured } from "../config/cloudinary";

configureCloudinary();

const MAX_BYTES = 5 * 1024 * 1024;

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

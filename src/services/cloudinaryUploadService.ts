import { cloudinary, configureCloudinary, isCloudinaryConfigured } from "../config/cloudinary";

configureCloudinary();

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PDF_MAX_BYTES = 10 * 1024 * 1024;
const MAX_BYTES = IMAGE_MAX_BYTES;

function isPdfUpload(mimeType: string, originalName?: string): boolean {
  const name = (originalName ?? "").toLowerCase();
  return (
    mimeType === "application/pdf" ||
    mimeType === "application/x-pdf" ||
    name.endsWith(".pdf")
  );
}

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

export async function uploadOptionalPaymentProof(
  buffer: Buffer,
  folderKey: string,
  mimeType: string
): Promise<{ url: string; publicId: string }> {
  if (!isCloudinaryConfigured()) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }

  if (buffer.length > MAX_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const safeKey = folderKey.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || "public";
  const folder = `bdoq-academy/optional-payments/${safeKey}`;

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
  resourceType: "image" | "raw" = "image",
  originalName?: string
): Promise<{ url: string; publicId: string }> {
  if (!isCloudinaryConfigured()) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }

  const pdf = isPdfUpload(mimeType, originalName);
  const maxBytes = pdf ? PDF_MAX_BYTES : IMAGE_MAX_BYTES;

  if (buffer.length > maxBytes) {
    throw new Error("FILE_TOO_LARGE");
  }

  const result = await cloudinary.uploader.upload(
    `data:${mimeType};base64,${buffer.toString("base64")}`,
    pdf
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
        }
  );

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

function extractCloudinaryPublicId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(
      /\/(?:image|raw|video)\/upload\/(?:v\d+\/)?(.+)$/
    );
    if (!match?.[1]) return null;
    return decodeURIComponent(match[1]).replace(/\.[a-z0-9]+$/i, "");
  } catch {
    return null;
  }
}

export function toSignedMediaUrl(
  url?: string,
  publicId?: string
): string | undefined {
  if (!url) return url;
  const lower = url.toLowerCase();
  const looksPdf =
    lower.includes(".pdf") ||
    lower.includes("/raw/upload/") ||
    lower.includes("f_pdf");
  if (!looksPdf) return url;
  if (!isCloudinaryConfigured()) return url;

  const id = (publicId?.trim() || extractCloudinaryPublicId(url) || "").replace(
    /\.[a-z0-9]+$/i,
    ""
  );
  if (!id) return url;

  const resourceType = url.includes("/raw/upload/") ? "raw" : "image";
  try {
    return cloudinary.url(id, {
      resource_type: resourceType,
      type: "upload",
      sign_url: true,
      secure: true,
      ...(resourceType === "image" ? { format: "pdf" } : {}),
    });
  } catch {
    return url;
  }
}

const MAX_IMAGE_RESOURCE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_RESOURCE_BYTES = 100 * 1024 * 1024;

export async function uploadResourceMedia(
  buffer: Buffer,
  folder: string,
  mimeType: string,
  resourceType: "image" | "raw" | "video" = "raw"
): Promise<{ url: string; publicId: string }> {
  if (!isCloudinaryConfigured()) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }

  const maxBytes =
    resourceType === "video" ? MAX_VIDEO_RESOURCE_BYTES : MAX_IMAGE_RESOURCE_BYTES;

  if (buffer.length > maxBytes) {
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

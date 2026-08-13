import bcrypt from "bcryptjs";

export const MIN_APPLICATION_PASSWORD_LENGTH = 6;

const PASSWORD_KEYS = new Set(["password", "confirmPassword", "passwordHash"]);

export function stripPasswordFields(
  formData: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(formData).filter(([key]) => !PASSWORD_KEYS.has(key))
  );
}

export function readApplicationPassword(
  formData: Record<string, unknown>
): { password: string } | { error: string } {
  const password =
    typeof formData.password === "string" ? formData.password : "";
  const confirmPassword =
    typeof formData.confirmPassword === "string" ? formData.confirmPassword : "";

  if (password.length < MIN_APPLICATION_PASSWORD_LENGTH) {
    return {
      error: `Password must be at least ${MIN_APPLICATION_PASSWORD_LENGTH} characters.`,
    };
  }

  if (confirmPassword && password !== confirmPassword) {
    return { error: "Password and confirm password do not match." };
  }

  return { password };
}

export async function hashApplicationPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export interface IParentInfo {
  name?: string;
  relationship?: string;
  whatsapp?: string;
  email?: string;
}

export function extractParentInfoFromFormData(
  formData: Record<string, unknown> | undefined
): IParentInfo | undefined {
  if (!formData) return undefined;

  const name =
    typeof formData.parentName === "string" ? formData.parentName.trim() : "";
  const relationship =
    typeof formData.parentRelationship === "string"
      ? formData.parentRelationship.trim()
      : "";
  const whatsapp =
    typeof formData.parentWhatsapp === "string"
      ? formData.parentWhatsapp.trim()
      : "";
  const email =
    typeof formData.parentEmail === "string" ? formData.parentEmail.trim() : "";

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

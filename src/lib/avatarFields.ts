export function avatarFieldsFromUser(user: {
  avatarUrl?: string | null;
}): { avatarUrl: string } {
  return { avatarUrl: user.avatarUrl?.trim() || "" };
}

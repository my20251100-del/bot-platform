const DEFAULT_ADMIN_EMAILS = ["bnhatm90@gmail.com"];

function rawAdminEmails(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : DEFAULT_ADMIN_EMAILS;
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return rawAdminEmails().includes(email.trim().toLowerCase());
}

export function isAdminUser(user?: { email?: string | null } | null): boolean {
  return isAdminEmail(user?.email);
}
/**
 * Admin access: an allow-listed email address that has been verified.
 * Set ADMIN_EMAILS (comma-separated) in the environment to change the list.
 */

const DEFAULT_ADMIN_EMAILS = 'david@sails.tax,claytondb@gmail.com';

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || DEFAULT_ADMIN_EMAILS)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user: { email?: string | null; emailVerified?: boolean | null } | null | undefined): boolean {
  if (!user?.email || !user.emailVerified) return false;
  return getAdminEmails().includes(user.email.trim().toLowerCase());
}

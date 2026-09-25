/**
 * Which automated emails the daily job may send.
 *
 * Deadline reminders are part of the product customers signed up for (and each
 * user can turn them off in Settings → Notifications), so they are always on.
 *
 * Onboarding (drip) emails and the weekly digest are new outbound email that
 * has never been sent to existing users, so they stay OFF until the owner turns
 * them on by setting the environment variable to "true" in Vercel.
 */

function envFlag(name: string): boolean {
  return (process.env[name] || '').trim().toLowerCase() === 'true';
}

export function onboardingEmailsEnabled(): boolean {
  return envFlag('ONBOARDING_EMAILS_ENABLED');
}

export function weeklyDigestEnabled(): boolean {
  return envFlag('WEEKLY_DIGEST_ENABLED');
}

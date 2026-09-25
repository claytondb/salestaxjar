/**
 * Which automated emails the daily job may send.
 *
 * None of these have ever been sent to existing users, so each stays OFF until
 * the owner turns it on by setting its environment variable to "true" in Vercel:
 *   DEADLINE_REMINDERS_ENABLED  — filing deadline reminders (7 days / 1 day before).
 *       Turn on only after due dates follow each state's own schedule, then set
 *       the 'deadline_reminders' capability to 'live' so the site mentions them.
 *   ONBOARDING_EMAILS_ENABLED   — the 4-step onboarding (drip) sequence. Goes to
 *       verified addresses only; honors the "Getting-started tips" toggle.
 *   WEEKLY_DIGEST_ENABLED       — the weekly summary email (not built yet)
 * Each user can turn these off in Settings → Notifications.
 */

function envFlag(name: string): boolean {
  return (process.env[name] || '').trim().toLowerCase() === 'true';
}

export function deadlineRemindersEnabled(): boolean {
  return envFlag('DEADLINE_REMINDERS_ENABLED');
}

export function onboardingEmailsEnabled(): boolean {
  return envFlag('ONBOARDING_EMAILS_ENABLED');
}

export function weeklyDigestEnabled(): boolean {
  return envFlag('WEEKLY_DIGEST_ENABLED');
}

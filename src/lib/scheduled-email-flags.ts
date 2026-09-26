/**
 * Which automated emails the daily job may send.
 *
 * None of these have ever been sent to existing users, so each stays OFF until
 * the owner turns it on by setting its environment variable to "true" in Vercel:
 *   DEADLINE_REMINDERS_ENABLED  — filing deadline reminders (7 days / 1 day before),
 *       one email per person per day. Due dates follow each state's schedule.
 *       If you turn this off, set the 'deadline_reminders' capability back to
 *       'planned' so the site stops mentioning them.
 *   ONBOARDING_EMAILS_ENABLED   — the 4-step onboarding (drip) sequence. Goes to
 *       verified addresses only; honors the "Getting-started tips" toggle.
 *   WEEKLY_DIGEST_ENABLED       — the weekly summary email (not built yet)
 *   AUTO_SYNC_ALERTS_ENABLED    — let the daily automatic store sync create
 *       threshold alerts and send their emails. While off, alerts (and their
 *       emails) only come from syncs the seller starts.
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

export function autoSyncAlertsEnabled(): boolean {
  return envFlag('AUTO_SYNC_ALERTS_ENABLED');
}

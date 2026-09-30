/**
 * Filing Deadline Reminder Emails
 *
 * Sends 7-day and 1-day reminder emails for upcoming sales tax filing deadlines.
 * Designed to be called from a cron-style route (e.g. /api/filings/reminders).
 *
 * Rules:
 *  - Only sends for 'pending' filings (not filed, not overdue)
 *  - 7-day reminder: due date is 7 days from today (±0 days tolerance)
 *  - 1-day reminder: due date is 1 day from today (±0 days tolerance)
 *  - One email per person per window, listing every return due that day
 *    (a seller registered in many states gets one email, not dozens)
 *  - Deduplicated per return: tracks sent reminders in DB to avoid re-sends
 *  - Verified addresses only, and only if the user's preferences allow it
 */

import { Resend } from 'resend';
import { prisma } from './prisma';
import { describeFilingPeriod } from './filing-deadlines';

// The period wording lives with the other filing-date helpers, which are safe to use in the browser.
export { describeFilingPeriod };

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Sails <noreply@sails.tax>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sails.tax';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReminderWindow = 7 | 1;

export interface FilingReminderParams {
  to: string;
  name: string;
  userId: string;
  filingId: string;
  stateCode: string;
  stateName: string;
  periodLabel: string; // e.g. "Q1 2026"
  dueDate: Date;
  daysUntilDue: number;
  estimatedTax: number | null;
}

/** One return in a reminder email. */
export interface FilingReminderItem {
  filingId: string;
  stateCode: string;
  stateName: string;
  periodLabel: string;
  /** Cents, or null when unknown */
  estimatedTax: number | null;
}

export interface FilingReminderDigestParams {
  to: string;
  name: string;
  userId: string;
  dueDate: Date;
  daysUntilDue: number;
  items: FilingReminderItem[];
}

export interface ReminderResult {
  filingId: string;
  stateCode: string;
  daysUntilDue: number;
  success: boolean;
  alreadySent?: boolean;
  messageId?: string;
  error?: string;
}

export interface BatchReminderResult {
  /** Returns due in the window */
  processed: number;
  /** Returns reminded in this run */
  sent: number;
  alreadySent: number;
  failed: number;
  /** Emails sent (one per person) */
  emails?: number;
  results: ReminderResult[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format a date as "April 20, 2026"
 */
export function formatDueDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Format cents as "$1,234.56" or "unknown" if null
 */
export function formatTaxAmount(cents: number | null): string {
  if (cents === null) return 'unknown';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}


/**
 * Get the string key used to deduplicate a reminder
 */
export function getReminderKey(filingId: string, daysUntilDue: ReminderWindow): string {
  return `filing_reminder_${daysUntilDue}d_${filingId}`;
}

/**
 * Return the urgency label for the header
 */
export function getUrgencyLabel(daysUntilDue: number): {
  emoji: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  if (daysUntilDue <= 1) {
    return {
      emoji: '🚨',
      label: 'Due Tomorrow',
      color: '#dc2626',
      bgColor: '#fef2f2',
      borderColor: '#ef4444',
    };
  }
  return {
    emoji: '📅',
    label: 'Due in 7 Days',
    color: '#d97706',
    bgColor: '#fffbeb',
    borderColor: '#f59e0b',
  };
}

// ─── Email Template ───────────────────────────────────────────────────────────

export function buildFilingReminderEmail(params: FilingReminderParams): {
  subject: string;
  html: string;
  text: string;
} {
  const urgency = getUrgencyLabel(params.daysUntilDue);
  const dueDateStr = formatDueDate(params.dueDate);
  const taxAmountStr = formatTaxAmount(params.estimatedTax);
  const filingUrl = `${APP_URL}/filings`;

  const dueText =
    params.daysUntilDue <= 1
      ? 'Your filing is due <strong>tomorrow</strong>.'
      : `Your filing is due in <strong>${params.daysUntilDue} days</strong> on ${dueDateStr}.`;

  const subject =
    params.daysUntilDue <= 1
      ? `🚨 Sales Tax Due Tomorrow — ${params.stateName} ${params.periodLabel}`
      : `📅 Sales Tax Due in 7 Days — ${params.stateName} ${params.periodLabel}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #581c87 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #10b981; font-size: 28px; font-weight: bold;">Sails</h1>
              <p style="margin: 10px 0 0; color: #94a3b8; font-size: 14px;">Sales Tax Made Breezy</p>
            </td>
          </tr>

          <!-- Urgency Banner -->
          <tr>
            <td style="background-color: ${urgency.bgColor}; border-left: 4px solid ${urgency.borderColor}; padding: 16px 32px;">
              <p style="margin: 0; color: ${urgency.color}; font-size: 16px; font-weight: 700;">
                ${urgency.emoji} ${urgency.label} — ${params.stateName}
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 22px;">Hi ${escapeHtml(params.name)},</h2>
              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
                ${dueText}
              </p>

              <!-- Filing Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <span style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">State</span><br>
                          <span style="color: #0f172a; font-size: 16px; font-weight: 600; margin-top: 4px; display: block;">${params.stateName} (${params.stateCode})</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <span style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Period</span><br>
                          <span style="color: #0f172a; font-size: 16px; font-weight: 600; margin-top: 4px; display: block;">${params.periodLabel}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <span style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Due Date</span><br>
                          <span style="color: #0f172a; font-size: 16px; font-weight: 600; margin-top: 4px; display: block;">${dueDateStr}</span>
                        </td>
                      </tr>
                      ${
                        params.estimatedTax !== null
                          ? `<tr>
                        <td>
                          <span style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Estimated Tax</span><br>
                          <span style="color: #0f172a; font-size: 16px; font-weight: 600; margin-top: 4px; display: block;">${taxAmountStr}</span>
                        </td>
                      </tr>`
                          : ''
                      }
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <a href="${filingUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      View Filing Details →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px; color: #475569; font-size: 14px; line-height: 1.6;">
                Once you've filed, mark this deadline as complete in Sails to keep your records up to date.
              </p>

              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">
                ${REMINDER_FOOTNOTE_HTML}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                Sails · Sales Tax Made Breezy · <a href="${APP_URL}" style="color: #10b981; text-decoration: none;">sails.tax</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${urgency.emoji} Filing Reminder — ${params.stateName} ${params.periodLabel}

Hi ${params.name},

Your ${params.stateName} sales tax filing for ${params.periodLabel} is due ${
    params.daysUntilDue <= 1 ? 'tomorrow' : `in ${params.daysUntilDue} days`
  } (${dueDateStr}).

Filing Details:
  State: ${params.stateName} (${params.stateCode})
  Period: ${params.periodLabel}
  Due Date: ${dueDateStr}${params.estimatedTax !== null ? `\n  Estimated Tax: ${taxAmountStr}` : ''}

View your filings: ${filingUrl}

Once filed, mark this deadline as complete in Sails to keep your records current.

—
Sails · Sales Tax Made Breezy · ${APP_URL}
Manage notifications: ${APP_URL}/settings#notifications`;

  return { subject, html, text };
}

// ─── Several returns due the same day ─────────────────────────────────────────

const REMINDER_FOOTNOTE_TEXT =
  "You're getting this because you track these states in Sails. Due dates follow each state's published schedule for the filing frequency Sails assumes (usually quarterly); your state may have assigned you a different one, and a due date on a weekend or holiday usually moves to the next business day. Check amounts and deadlines with the state before you file.";
const REMINDER_FOOTNOTE_HTML = `${REMINDER_FOOTNOTE_TEXT} <a href="${APP_URL}/settings#notifications" style="color: #10b981;">Manage email preferences</a>.`;

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * The reminder email for everything a person has due on one day. With one
 * return it's the single-return email; with more, one email lists them all.
 */
export function buildFilingReminderDigestEmail(params: FilingReminderDigestParams): {
  subject: string;
  html: string;
  text: string;
} {
  if (params.items.length === 1) {
    const [item] = params.items;
    return buildFilingReminderEmail({
      to: params.to,
      name: params.name,
      userId: params.userId,
      filingId: item.filingId,
      stateCode: item.stateCode,
      stateName: item.stateName,
      periodLabel: item.periodLabel,
      dueDate: params.dueDate,
      daysUntilDue: params.daysUntilDue,
      estimatedTax: item.estimatedTax,
    });
  }

  const count = params.items.length;
  const urgency = getUrgencyLabel(params.daysUntilDue);
  const dueDateStr = formatDueDate(params.dueDate);
  const when = params.daysUntilDue <= 1 ? 'tomorrow' : `in ${params.daysUntilDue} days`;
  const filingUrl = `${APP_URL}/filings`;
  const subject = `${urgency.emoji} ${count} sales tax returns due ${when} (${dueDateStr})`;
  const showTax = params.items.some((i) => i.estimatedTax !== null);
  const name = escapeHtml(params.name);

  const rows = params.items
    .map(
      (i) => `<tr>
                  <td style="padding: 10px 12px; border-top: 1px solid #e2e8f0; color: #0f172a; font-size: 15px; font-weight: 600;">${escapeHtml(i.stateName)} (${i.stateCode})</td>
                  <td style="padding: 10px 12px; border-top: 1px solid #e2e8f0; color: #475569; font-size: 15px;">${escapeHtml(i.periodLabel)}</td>${
                    showTax
                      ? `
                  <td style="padding: 10px 12px; border-top: 1px solid #e2e8f0; color: #475569; font-size: 15px; text-align: right;">${i.estimatedTax !== null ? formatTaxAmount(i.estimatedTax) : '—'}</td>`
                      : ''
                  }
                </tr>`
    )
    .join('\n                ');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #581c87 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #10b981; font-size: 28px; font-weight: bold;">Sails</h1>
              <p style="margin: 10px 0 0; color: #94a3b8; font-size: 14px;">Sales Tax Made Breezy</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: ${urgency.bgColor}; border-left: 4px solid ${urgency.borderColor}; padding: 16px 32px;">
              <p style="margin: 0; color: ${urgency.color}; font-size: 16px; font-weight: 700;">
                ${urgency.emoji} ${count} returns due ${when} — ${dueDateStr}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 22px;">Hi ${name},</h2>
              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
                These sales tax returns are due <strong>${when}</strong>, on ${dueDateStr}:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px; border-collapse: collapse;">
                <tr>
                  <th align="left" style="padding: 10px 12px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">State</th>
                  <th align="left" style="padding: 10px 12px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Period</th>${
                    showTax
                      ? `
                  <th align="right" style="padding: 10px 12px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Estimated tax</th>`
                      : ''
                  }
                </tr>
                ${rows}
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <a href="${filingUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Open your filing calendar →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px; color: #475569; font-size: 14px; line-height: 1.6;">
                Once you've filed, mark each return as filed in Sails to keep your records up to date.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">
                ${REMINDER_FOOTNOTE_HTML}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                Sails · Sales Tax Made Breezy · <a href="${APP_URL}" style="color: #10b981; text-decoration: none;">sails.tax</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const lines = params.items.map(
    (i) => `  • ${i.stateName} (${i.stateCode}) — ${i.periodLabel}${i.estimatedTax !== null ? ` — estimated ${formatTaxAmount(i.estimatedTax)}` : ''}`
  );
  const text = `${urgency.emoji} ${count} sales tax returns due ${when} (${dueDateStr})

Hi ${params.name},

These sales tax returns are due ${when}, on ${dueDateStr}:
${lines.join('\n')}

Open your filing calendar: ${filingUrl}

Once you've filed, mark each return as filed in Sails to keep your records up to date.

${REMINDER_FOOTNOTE_TEXT}

—
Sails · Sales Tax Made Breezy · ${APP_URL}
Manage email preferences: ${APP_URL}/settings#notifications`;

  return { subject, html, text };
}

/**
 * Send one reminder email covering several returns. Records a log entry per
 * return (its dedupe key), so a return is never reminded twice for the same
 * window.
 */
export async function sendFilingReminderDigest(
  params: FilingReminderDigestParams & { daysUntilDue: ReminderWindow }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const template = buildFilingReminderDigestEmail(params);
  const keys = params.items.map((i) => getReminderKey(i.filingId, params.daysUntilDue));
  const log = async (status: 'sent' | 'failed', extra: { messageId?: string; error?: string }) => {
    for (const template_ of keys) {
      try {
        await prisma.emailLog.create({
          data: { userId: params.userId, to: params.to, subject: template.subject, template: template_, status, ...extra },
        });
      } catch {
        // Logging must never break sending
      }
    }
  };

  if (!resend) {
    console.log('📧 [DEV] Filing reminder would send:', { to: params.to, subject: template.subject, returns: keys.length });
    const messageId = 'dev-' + Date.now();
    await log('sent', { messageId });
    return { success: true, messageId };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      replyTo: process.env.REPLY_TO_EMAIL || 'support@sails.tax',
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    // Resend reports API failures in `error` instead of throwing.
    if (result.error) {
      throw new Error(result.error.message || 'Email provider rejected the message');
    }
    const messageId = result.data?.id;
    await log('sent', { messageId });
    return { success: true, messageId };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    await log('failed', { error: errMsg });
    console.error('Filing reminder email error:', error);
    return { success: false, error: errMsg };
  }
}

// ─── Send one reminder ────────────────────────────────────────────────────────

export async function sendFilingReminder(
  params: FilingReminderParams
): Promise<ReminderResult> {
  const daysUntilDue = params.daysUntilDue as ReminderWindow;
  const dedupeKey = getReminderKey(params.filingId, daysUntilDue);

  // Check if already sent
  const existing = await prisma.emailLog.findFirst({
    where: {
      userId: params.userId,
      template: dedupeKey,
      status: 'sent',
    },
  });

  if (existing) {
    return {
      filingId: params.filingId,
      stateCode: params.stateCode,
      daysUntilDue: params.daysUntilDue,
      success: true,
      alreadySent: true,
    };
  }

  const template = buildFilingReminderEmail(params);

  if (!resend) {
    // Dev mode — log and record
    console.log('📧 [DEV] Filing reminder would send:', {
      to: params.to,
      subject: template.subject,
      state: params.stateName,
      daysUntilDue: params.daysUntilDue,
    });

    const devMessageId = 'dev-' + Date.now();
    try {
      await prisma.emailLog.create({
        data: {
          userId: params.userId,
          to: params.to,
          subject: template.subject,
          template: dedupeKey,
          status: 'sent',
          messageId: devMessageId,
        },
      });
    } catch {
      // Ignore logging errors
    }

    return {
      filingId: params.filingId,
      stateCode: params.stateCode,
      daysUntilDue: params.daysUntilDue,
      success: true,
      messageId: devMessageId,
    };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      replyTo: process.env.REPLY_TO_EMAIL || 'support@sails.tax',
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    // Resend reports API failures in `error` instead of throwing.
    if (result.error) {
      throw new Error(result.error.message || 'Email provider rejected the message');
    }

    const messageId = result.data?.id;

    await prisma.emailLog.create({
      data: {
        userId: params.userId,
        to: params.to,
        subject: template.subject,
        template: dedupeKey,
        status: 'sent',
        messageId,
      },
    });

    return {
      filingId: params.filingId,
      stateCode: params.stateCode,
      daysUntilDue: params.daysUntilDue,
      success: true,
      messageId,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';

    try {
      await prisma.emailLog.create({
        data: {
          userId: params.userId,
          to: params.to,
          subject: template.subject,
          template: dedupeKey,
          status: 'failed',
          error: errMsg,
        },
      });
    } catch {
      // Ignore
    }

    console.error('Filing reminder email error:', error);
    return {
      filingId: params.filingId,
      stateCode: params.stateCode,
      daysUntilDue: params.daysUntilDue,
      success: false,
      error: errMsg,
    };
  }
}

// ─── Batch processor ──────────────────────────────────────────────────────────

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

/**
 * Find all pending filings due in exactly `window` days and send reminder emails.
 * Returns a summary of what was processed.
 */
export async function processBatchReminders(
  window: ReminderWindow
): Promise<BatchReminderResult> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const targetDate = new Date(today);
  targetDate.setUTCDate(today.getUTCDate() + window);

  const nextDay = new Date(targetDate);
  nextDay.setUTCDate(targetDate.getUTCDate() + 1);

  // Find all pending filings due within the target window
  const filings = await prisma.filing.findMany({
    where: {
      status: 'pending',
      dueDate: {
        gte: targetDate,
        lt: nextDay,
      },
    },
    include: {
      business: {
        include: {
          user: true,
        },
      },
    },
  });

  const result: BatchReminderResult = {
    processed: filings.length,
    sent: 0,
    alreadySent: 0,
    failed: 0,
    results: [],
  };

  // Respect each user's "Deadline reminders" email setting (default: on).
  const userIds = [...new Set(filings.map((f) => f.business.user?.id).filter((id): id is string => !!id))];
  const optedOut = new Set(
    userIds.length === 0
      ? []
      : (
          await prisma.notificationPreference.findMany({
            where: { userId: { in: userIds }, emailDeadlineReminders: false },
            select: { userId: true },
          })
        ).map((p) => p.userId)
  );

  // One email per person, listing every return due that day
  type UserRow = NonNullable<(typeof filings)[number]['business']['user']>;
  const groups = new Map<string, { user: UserRow; filings: typeof filings }>();
  for (const filing of filings) {
    const user = filing.business.user;
    if (!user?.email) continue;
    if (!user.emailVerified) continue; // only email verified addresses
    if (optedOut.has(user.id)) continue;
    const group = groups.get(user.id) ?? { user, filings: [] };
    group.filings.push(filing);
    groups.set(user.id, group);
  }

  let emails = 0;
  for (const { user, filings: userFilings } of groups.values()) {
    const items: FilingReminderItem[] = userFilings
      .map((f) => ({
        filingId: f.id,
        stateCode: f.stateCode,
        stateName: STATE_NAMES[f.stateCode] || f.stateCode,
        periodLabel: describeFilingPeriod(f.period, new Date(f.periodStart), new Date(f.periodEnd)),
        estimatedTax: f.estimatedTax != null ? Math.round(Number(f.estimatedTax) * 100) : null,
      }))
      .sort((a, b) => a.stateName.localeCompare(b.stateName));

    // Leave out returns already reminded for this window (e.g. the job ran twice)
    const already = await prisma.emailLog.findMany({
      where: {
        userId: user.id,
        status: 'sent',
        template: { in: items.map((i) => getReminderKey(i.filingId, window)) },
      },
      select: { template: true },
    });
    const alreadyKeys = new Set(already.map((a) => a.template));
    const toSend: FilingReminderItem[] = [];
    for (const item of items) {
      if (alreadyKeys.has(getReminderKey(item.filingId, window))) {
        result.alreadySent++;
        result.results.push({ filingId: item.filingId, stateCode: item.stateCode, daysUntilDue: window, success: true, alreadySent: true });
      } else {
        toSend.push(item);
      }
    }
    if (toSend.length === 0) continue;

    const delivery = await sendFilingReminderDigest({
      to: user.email,
      name: user.name || user.email.split('@')[0],
      userId: user.id,
      dueDate: new Date(userFilings[0].dueDate),
      daysUntilDue: window,
      items: toSend,
    });
    if (delivery.success) emails++;
    for (const item of toSend) {
      result.results.push({
        filingId: item.filingId,
        stateCode: item.stateCode,
        daysUntilDue: window,
        success: delivery.success,
        messageId: delivery.messageId,
        error: delivery.error,
      });
      if (delivery.success) result.sent++;
      else result.failed++;
    }
  }

  result.emails = emails;
  return result;
}

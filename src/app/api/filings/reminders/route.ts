import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { processBatchReminders } from '@/lib/filing-reminders';
import { isCronAuthorized } from '@/lib/cron-auth';
import { isAdminUser } from '@/lib/admin';
import { deadlineRemindersEnabled } from '@/lib/scheduled-email-flags';

/**
 * GET /api/filings/reminders
 *
 * Process and send filing deadline reminder emails.
 * Sends 7-day and 1-day reminders for pending filings.
 *
 * Access:
 *  - CRON_SECRET (Authorization: Bearer … or x-cron-secret header)
 *  - Authenticated, verified admin user
 *
 * The scheduled daily run happens in /api/cron/daily. Like that job, this
 * sends nothing unless DEADLINE_REMINDERS_ENABLED=true.
 *
 * Returns a summary of emails sent.
 */
export async function GET(request: NextRequest) {
  // Allow scheduled/cron calls with the shared secret
  const hasValidCronSecret = !!process.env.CRON_SECRET && isCronAuthorized(request);

  if (!hasValidCronSecret) {
    // Fall back to admin user auth. A plain authenticated user is NOT sufficient
    // to trigger mass reminder emails — must be a verified admin.
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  if (!deadlineRemindersEnabled()) {
    return NextResponse.json({
      ok: true,
      skipped: 'Deadline reminders are turned off (DEADLINE_REMINDERS_ENABLED is not true).',
    });
  }

  try {
    const [result7, result1] = await Promise.all([
      processBatchReminders(7),
      processBatchReminders(1),
    ]);

    const totalSent = result7.sent + result1.sent;
    const totalFailed = result7.failed + result1.failed;
    const totalAlreadySent = result7.alreadySent + result1.alreadySent;

    return NextResponse.json({
      ok: true,
      summary: {
        totalProcessed: result7.processed + result1.processed,
        totalSent,
        totalAlreadySent,
        totalFailed,
      },
      sevenDay: {
        processed: result7.processed,
        sent: result7.sent,
        alreadySent: result7.alreadySent,
        failed: result7.failed,
      },
      oneDay: {
        processed: result1.processed,
        sent: result1.sent,
        alreadySent: result1.alreadySent,
        failed: result1.failed,
      },
    });
  } catch (error) {
    console.error('[filings/reminders] Error processing reminders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { processBatchReminders } from '@/lib/filing-reminders';

/**
 * GET /api/filings/reminders
 *
 * Process and send filing deadline reminder emails.
 * Sends 7-day and 1-day reminders for pending filings.
 *
 * Access:
 *  - CRON_SECRET header (for automated cron calls)
 *  - Authenticated admin user
 *
 * Returns a summary of emails sent.
 */
export async function GET(request: NextRequest) {
  // Allow cron calls with secret header
  const cronSecret = request.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;

  if (!cronSecret || !expectedSecret || cronSecret !== expectedSecret) {
    // Fall back to user auth
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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

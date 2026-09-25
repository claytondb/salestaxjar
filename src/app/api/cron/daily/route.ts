/**
 * GET /api/cron/daily — the one scheduled job (see vercel.json).
 *
 * Runs once a day. Each task is isolated so one failure never blocks the rest:
 *   1. Encrypt any store credentials saved before encryption at rest existed.
 *   2. Clear buyer details stored before data minimization (emails, raw payloads).
 *   3. Filing calendar upkeep: add each nexus state's current return, and fix
 *      due dates on pending returns that don't match the state's schedule.
 *   4. Filing deadline reminders (7 days and 1 day before) — only when
 *      DEADLINE_REMINDERS_ENABLED=true; respects each user's email settings.
 *   5. Onboarding emails — only when ONBOARDING_EMAILS_ENABLED=true.
 *   6. Sync connected Shopify and WooCommerce stores, with whatever time is
 *      left. Stores not reached today go first tomorrow.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron-auth';
import { encryptLegacyPlatformTokens } from '@/lib/platform-token-migration';
import { processBatchReminders } from '@/lib/filing-reminders';
import { runDripCampaign } from '@/lib/drip';
import { onboardingEmailsEnabled, deadlineRemindersEnabled } from '@/lib/scheduled-email-flags';
import { ensureCurrentFilingsForAll, correctPendingDueDates } from '@/lib/filing-schedule';
import { autoSyncConnections } from '@/lib/auto-sync';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;
/** Leave a margin under maxDuration for the response and logging. */
const RUN_BUDGET_MS = 105_000;

type TaskResult = { ok: true; result: unknown } | { ok: false; error: string } | { ok: true; skipped: string };

async function runTask(name: string, fn: () => Promise<unknown>): Promise<TaskResult> {
  try {
    const result = await fn();
    return { ok: true, result };
  } catch (error) {
    console.error(`[cron/daily] ${name} failed:`, error);
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = new Date();
  const deadline = startedAt.getTime() + RUN_BUDGET_MS;
  const tasks: Record<string, TaskResult> = {};

  tasks.encryptLegacyTokens = await runTask('encryptLegacyTokens', () => encryptLegacyPlatformTokens());

  tasks.minimizeStoredOrders = await runTask('minimizeStoredOrders', async () => {
    const r = await prisma.importedOrder.updateMany({
      where: { OR: [{ customerEmail: { not: null } }, { rawData: { not: null } }] },
      data: { customerEmail: null, rawData: null },
    });
    return { cleared: r.count };
  });

  // Due dates first, so reminders below use the corrected dates
  tasks.correctDueDates = await runTask('correctDueDates', () => correctPendingDueDates(startedAt));
  tasks.currentFilings = await runTask('currentFilings', () => ensureCurrentFilingsForAll(startedAt));

  if (deadlineRemindersEnabled()) {
    tasks.reminders7Day = await runTask('reminders7Day', async () => {
      const r = await processBatchReminders(7);
      return { processed: r.processed, sent: r.sent, alreadySent: r.alreadySent, failed: r.failed };
    });
    tasks.reminders1Day = await runTask('reminders1Day', async () => {
      const r = await processBatchReminders(1);
      return { processed: r.processed, sent: r.sent, alreadySent: r.alreadySent, failed: r.failed };
    });
  } else {
    tasks.reminders = { ok: true, skipped: 'DEADLINE_REMINDERS_ENABLED is not true' };
  }

  tasks.onboardingEmails = onboardingEmailsEnabled()
    ? await runTask('onboardingEmails', () => runDripCampaign())
    : { ok: true, skipped: 'ONBOARDING_EMAILS_ENABLED is not true' };

  // Last, because it uses whatever time is left
  tasks.storeSync = await runTask('storeSync', () => autoSyncConnections({ deadline, now: startedAt }));

  const ok = Object.values(tasks).every((t) => t.ok);
  console.log('[cron/daily] finished', JSON.stringify({ ok, tasks }));

  return NextResponse.json(
    {
      ok,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      tasks,
    },
    { status: ok ? 200 : 207 }
  );
}

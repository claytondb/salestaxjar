/**
 * GET /api/cron/daily — the one scheduled job (see vercel.json).
 *
 * Runs once a day. Each task is isolated so one failure never blocks the rest:
 *   1. Encrypt any store credentials saved before encryption at rest existed.
 *   2. Clear buyer details stored before data minimization (emails, raw payloads).
 *   3. Filing deadline reminders (7 days and 1 day before) — only when
 *      DEADLINE_REMINDERS_ENABLED=true; respects each user's email settings.
 *   4. Onboarding emails — only when ONBOARDING_EMAILS_ENABLED=true.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron-auth';
import { encryptLegacyPlatformTokens } from '@/lib/platform-token-migration';
import { processBatchReminders } from '@/lib/filing-reminders';
import { runDripCampaign } from '@/lib/drip';
import { onboardingEmailsEnabled, deadlineRemindersEnabled } from '@/lib/scheduled-email-flags';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
  const tasks: Record<string, TaskResult> = {};

  tasks.encryptLegacyTokens = await runTask('encryptLegacyTokens', () => encryptLegacyPlatformTokens());

  tasks.minimizeStoredOrders = await runTask('minimizeStoredOrders', async () => {
    const r = await prisma.importedOrder.updateMany({
      where: { OR: [{ customerEmail: { not: null } }, { rawData: { not: null } }] },
      data: { customerEmail: null, rawData: null },
    });
    return { cleared: r.count };
  });

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

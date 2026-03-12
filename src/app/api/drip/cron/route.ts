/**
 * GET /api/drip/cron
 *
 * Vercel Cron Job endpoint — runs daily at 9:00 AM UTC.
 * Finds users eligible for each drip day and sends them the appropriate email.
 *
 * Auth: Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically.
 * Falls back to DRIP_SECRET if CRON_SECRET is not set.
 *
 * Eligibility windows (with ±4h grace to account for cron drift):
 *   Day 1  — signed up 20–28h ago, no platform connected
 *   Day 3  — signed up 68–76h ago, no orders imported
 *   Day 7  — signed up 7d ±4h ago, still on free plan
 *   Day 14 — signed up 14d ±4h ago, still on free plan
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  sendDripDay1Email,
  sendDripDay3Email,
  sendDripDay7Email,
  sendDripDay14Email,
} from '@/lib/email';

const CRON_SECRET = process.env.CRON_SECRET || process.env.DRIP_SECRET;

function isAuthorized(request: NextRequest): boolean {
  if (!CRON_SECRET) {
    return process.env.NODE_ENV === 'development';
  }
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${CRON_SECRET}`;
}

// Hours window around each target (target ± grace)
const GRACE_HOURS = 4;

function windowFor(targetHours: number): { from: Date; to: Date } {
  const now = Date.now();
  return {
    from: new Date(now - (targetHours + GRACE_HOURS) * 3600 * 1000),
    to: new Date(now - (targetHours - GRACE_HOURS) * 3600 * 1000),
  };
}

/** Has a drip email already been sent to this user? */
async function alreadySent(userId: string, templateName: string): Promise<boolean> {
  const log = await prisma.emailLog.findFirst({
    where: { userId, template: templateName, status: 'sent' },
  });
  return !!log;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    day1: { processed: 0, sent: 0, skipped: 0, errors: 0 },
    day3: { processed: 0, sent: 0, skipped: 0, errors: 0 },
    day7: { processed: 0, sent: 0, skipped: 0, errors: 0 },
    day14: { processed: 0, sent: 0, skipped: 0, errors: 0 },
  };

  // ── Day 1: signed up ~24h ago, no platform connections ──────────────────────
  const day1Window = windowFor(24);
  const day1Users = await prisma.user.findMany({
    where: {
      createdAt: { gte: day1Window.from, lte: day1Window.to },
    },
    select: { id: true, email: true, name: true },
  });

  for (const user of day1Users) {
    results.day1.processed++;
    try {
      if (await alreadySent(user.id, 'drip_day1')) {
        results.day1.skipped++;
        continue;
      }
      const platformCount = await prisma.platformConnection.count({ where: { userId: user.id } });
      if (platformCount > 0) {
        results.day1.skipped++;
        continue;
      }
      const r = await sendDripDay1Email({ to: user.email, name: user.name, userId: user.id });
      if (r.success) results.day1.sent++;
      else results.day1.errors++;
    } catch (e) {
      console.error('Drip day1 error for user', user.id, e);
      results.day1.errors++;
    }
  }

  // ── Day 3: signed up ~72h ago, no imported orders ───────────────────────────
  const day3Window = windowFor(72);
  const day3Users = await prisma.user.findMany({
    where: {
      createdAt: { gte: day3Window.from, lte: day3Window.to },
    },
    select: { id: true, email: true, name: true },
  });

  for (const user of day3Users) {
    results.day3.processed++;
    try {
      if (await alreadySent(user.id, 'drip_day3')) {
        results.day3.skipped++;
        continue;
      }
      const orderCount = await prisma.importedOrder.count({ where: { userId: user.id } });
      if (orderCount > 0) {
        results.day3.skipped++;
        continue;
      }
      const r = await sendDripDay3Email({ to: user.email, name: user.name, userId: user.id });
      if (r.success) results.day3.sent++;
      else results.day3.errors++;
    } catch (e) {
      console.error('Drip day3 error for user', user.id, e);
      results.day3.errors++;
    }
  }

  // ── Day 7: signed up ~7d ago, still on free plan ────────────────────────────
  const day7Window = windowFor(7 * 24);
  const day7Users = await prisma.user.findMany({
    where: {
      createdAt: { gte: day7Window.from, lte: day7Window.to },
    },
    select: { id: true, email: true, name: true, subscription: { select: { status: true, plan: true } } },
  });

  for (const user of day7Users) {
    results.day7.processed++;
    try {
      if (await alreadySent(user.id, 'drip_day7')) {
        results.day7.skipped++;
        continue;
      }
      const isPaid =
        user.subscription?.status === 'active' && user.subscription?.plan !== 'free';
      if (isPaid) {
        results.day7.skipped++;
        continue;
      }
      const r = await sendDripDay7Email({ to: user.email, name: user.name, userId: user.id });
      if (r.success) results.day7.sent++;
      else results.day7.errors++;
    } catch (e) {
      console.error('Drip day7 error for user', user.id, e);
      results.day7.errors++;
    }
  }

  // ── Day 14: signed up ~14d ago, still on free plan ──────────────────────────
  const day14Window = windowFor(14 * 24);
  const day14Users = await prisma.user.findMany({
    where: {
      createdAt: { gte: day14Window.from, lte: day14Window.to },
    },
    select: { id: true, email: true, name: true, subscription: { select: { status: true, plan: true } } },
  });

  for (const user of day14Users) {
    results.day14.processed++;
    try {
      if (await alreadySent(user.id, 'drip_day14')) {
        results.day14.skipped++;
        continue;
      }
      const isPaid =
        user.subscription?.status === 'active' && user.subscription?.plan !== 'free';
      if (isPaid) {
        results.day14.skipped++;
        continue;
      }
      const r = await sendDripDay14Email({ to: user.email, name: user.name, userId: user.id });
      if (r.success) results.day14.sent++;
      else results.day14.errors++;
    } catch (e) {
      console.error('Drip day14 error for user', user.id, e);
      results.day14.errors++;
    }
  }

  console.log('Drip cron completed:', JSON.stringify(results));

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    results,
  });
}

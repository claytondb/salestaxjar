/**
 * Onboarding (drip) emails.
 *
 * Eligibility (the job runs once a day, so each window is 24h wide):
 *   Day 1  — signed up ~1 day ago, no platform connected
 *   Day 3  — signed up ~3 days ago, no orders imported
 *   Day 7  — signed up ~7 days ago, still on the free plan
 *   Day 14 — signed up ~14 days ago, still on the free plan
 *
 * Each email is sent at most once per user (checked against EmailLog), so
 * overlapping windows or a re-run never double-send. Only verified addresses
 * are emailed, and anyone who turned off "Getting-started tips" is skipped.
 */

import { prisma } from './prisma';
import {
  sendDripDay1Email,
  sendDripDay3Email,
  sendDripDay7Email,
  sendDripDay14Email,
} from './email';

/** Half-width of each eligibility window. 12h on each side = one full day. */
export const DRIP_GRACE_HOURS = 12;

export function dripWindowFor(targetHours: number, now: number = Date.now()): { from: Date; to: Date } {
  return {
    from: new Date(now - (targetHours + DRIP_GRACE_HOURS) * 3600 * 1000),
    to: new Date(now - (targetHours - DRIP_GRACE_HOURS) * 3600 * 1000),
  };
}

async function alreadySent(userId: string, templateName: string): Promise<boolean> {
  const log = await prisma.emailLog.findFirst({
    where: { userId, template: templateName, status: 'sent' },
  });
  return !!log;
}

/**
 * Drop users who turned off "Getting-started tips" in Settings → Notifications.
 * (That toggle is stored in NotificationPreference.emailWeeklyDigest.)
 */
async function withoutOptedOut<T extends { id: string }>(users: T[]): Promise<T[]> {
  if (users.length === 0) return users;
  const optedOut = await prisma.notificationPreference.findMany({
    where: { userId: { in: users.map((u) => u.id) }, emailWeeklyDigest: false },
    select: { userId: true },
  });
  const skip = new Set(optedOut.map((p) => p.userId));
  return users.filter((u) => !skip.has(u.id));
}

/** Paid (or trialing) users don't get the upgrade-focused emails. */
function isOnPaidPlan(subscription: { status: string | null; plan: string | null } | null | undefined): boolean {
  if (!subscription) return false;
  return ['active', 'trialing', 'past_due'].includes(subscription.status ?? '') && subscription.plan !== 'free';
}

export interface DripStepResult {
  processed: number;
  sent: number;
  skipped: number;
  errors: number;
}

export interface DripResults {
  day1: DripStepResult;
  day3: DripStepResult;
  day7: DripStepResult;
  day14: DripStepResult;
}

function emptyStep(): DripStepResult {
  return { processed: 0, sent: 0, skipped: 0, errors: 0 };
}

export async function runDripCampaign(): Promise<DripResults> {
  const results: DripResults = {
    day1: emptyStep(),
    day3: emptyStep(),
    day7: emptyStep(),
    day14: emptyStep(),
  };

  // ── Day 1: signed up ~24h ago, no platform connections ──────────────────────
  const day1Window = dripWindowFor(24);
  const day1Candidates = await prisma.user.findMany({
    where: {
      createdAt: { gte: day1Window.from, lte: day1Window.to },
      emailVerified: true,
    },
    select: { id: true, email: true, name: true },
  });
  const day1Users = await withoutOptedOut(day1Candidates);

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
  const day3Window = dripWindowFor(72);
  const day3Candidates = await prisma.user.findMany({
    where: {
      createdAt: { gte: day3Window.from, lte: day3Window.to },
      emailVerified: true,
    },
    select: { id: true, email: true, name: true },
  });
  const day3Users = await withoutOptedOut(day3Candidates);

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
  const day7Window = dripWindowFor(7 * 24);
  const day7Candidates = await prisma.user.findMany({
    where: {
      createdAt: { gte: day7Window.from, lte: day7Window.to },
      emailVerified: true,
    },
    select: { id: true, email: true, name: true, subscription: { select: { status: true, plan: true } } },
  });
  const day7Users = await withoutOptedOut(day7Candidates);

  for (const user of day7Users) {
    results.day7.processed++;
    try {
      if (await alreadySent(user.id, 'drip_day7')) {
        results.day7.skipped++;
        continue;
      }
      if (isOnPaidPlan(user.subscription)) {
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
  const day14Window = dripWindowFor(14 * 24);
  const day14Candidates = await prisma.user.findMany({
    where: {
      createdAt: { gte: day14Window.from, lte: day14Window.to },
      emailVerified: true,
    },
    select: { id: true, email: true, name: true, subscription: { select: { status: true, plan: true } } },
  });
  const day14Users = await withoutOptedOut(day14Candidates);

  for (const user of day14Users) {
    results.day14.processed++;
    try {
      if (await alreadySent(user.id, 'drip_day14')) {
        results.day14.skipped++;
        continue;
      }
      if (isOnPaidPlan(user.subscription)) {
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

  console.log('Drip campaign completed:', JSON.stringify(results));
  return results;
}

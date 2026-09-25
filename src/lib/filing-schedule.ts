/**
 * Keeps each seller's filing calendar current: creates the returns they're
 * working toward now, and corrects due dates on pending returns when the
 * state rules in filing-deadlines.ts change.
 */

import { prisma } from './prisma';
import { getCurrentDeadlines, getFilingDeadlines, type FilingPeriod } from './filing-deadlines';

interface NexusStateRef {
  stateCode: string;
  stateName: string;
}

/**
 * Make sure each nexus state has a filing for the period in progress and for
 * any period that ended but isn't due yet. Skips periods that already exist.
 * Returns how many filings were created.
 */
export async function ensureCurrentFilings(
  businessId: string,
  states: NexusStateRef[],
  now: Date = new Date()
): Promise<number> {
  let created = 0;
  for (const state of states) {
    const stateCode = state.stateCode.toUpperCase();
    for (const deadline of getCurrentDeadlines(stateCode, now)) {
      const existing = await prisma.filing.findFirst({
        where: { businessId, stateCode, periodStart: deadline.periodStart },
        select: { id: true },
      });
      if (existing) continue;
      try {
        await prisma.filing.create({
          data: {
            businessId,
            stateCode,
            stateName: state.stateName,
            period: deadline.period,
            periodStart: deadline.periodStart,
            periodEnd: deadline.periodEnd,
            dueDate: deadline.dueDate,
            status: 'pending',
          },
        });
        created++;
      } catch (error) {
        // Unique (businessId, stateCode, periodStart): another request created it first
        if (!(error instanceof Error && /Unique constraint/i.test(error.message))) throw error;
      }
    }
  }
  return created;
}

/** Every business with nexus states: make sure its current filings exist. */
export async function ensureCurrentFilingsForAll(now: Date = new Date()): Promise<{ businesses: number; created: number }> {
  const businesses = await prisma.business.findMany({
    where: { nexusStates: { some: { hasNexus: true } } },
    select: {
      id: true,
      nexusStates: { where: { hasNexus: true }, select: { stateCode: true, stateName: true } },
    },
  });
  let created = 0;
  for (const business of businesses) {
    created += await ensureCurrentFilings(business.id, business.nexusStates, now);
  }
  return { businesses: businesses.length, created };
}

const DAY_MS = 86_400_000;

/**
 * Correct the due date on pending filings that match one of the state's
 * periods exactly but have a different due date (for example, filings made
 * before a state's rule was fixed). Filed returns are never touched.
 */
export async function correctPendingDueDates(now: Date = new Date()): Promise<{ checked: number; corrected: number }> {
  const pending = await prisma.filing.findMany({
    where: { status: 'pending', dueDate: { gte: new Date(now.getTime() - 60 * DAY_MS) } },
    select: { id: true, stateCode: true, period: true, periodStart: true, periodEnd: true, dueDate: true },
  });
  let corrected = 0;
  for (const filing of pending) {
    const period = filing.period as FilingPeriod;
    if (period !== 'monthly' && period !== 'quarterly' && period !== 'annual') continue;
    const year = filing.periodEnd.getFullYear();
    const match = getFilingDeadlines(filing.stateCode, year, period).find(
      (d) =>
        d.period === period &&
        d.periodStart.getTime() === filing.periodStart.getTime() &&
        d.periodEnd.getTime() === filing.periodEnd.getTime()
    );
    if (!match || match.dueDate.getTime() === filing.dueDate.getTime()) continue;
    await prisma.filing.update({ where: { id: filing.id }, data: { dueDate: match.dueDate } });
    corrected++;
  }
  return { checked: pending.length, corrected };
}

/**
 * Keeps each seller's filing calendar current: creates the returns they're
 * working toward now, and corrects due dates on pending returns when the
 * state rules in filing-deadlines.ts change.
 */

import { prisma } from './prisma';
import {
  getCurrentDeadlines,
  getFilingDeadlines,
  offeredFilingPeriods,
  resolveFilingPeriod,
  type FilingPeriod,
} from './filing-deadlines';

interface NexusStateRef {
  stateCode: string;
  stateName: string;
}

const PERIODS: FilingPeriod[] = ['monthly', 'quarterly', 'annual'];

function isPeriod(value: string): value is FilingPeriod {
  return (PERIODS as string[]).includes(value);
}

/**
 * The frequency each state's calendar follows. States assign it at
 * registration; Sails starts with the state's usual one for a small seller,
 * and after the seller changes it (setFilingFrequency) the state's most
 * recent filing carries it — so there's no separate setting to store.
 */
export async function getFilingFrequencies(businessId: string, stateCodes: string[]): Promise<Map<string, FilingPeriod>> {
  const codes = [...new Set(stateCodes.map((c) => c.toUpperCase()))];
  const result = new Map<string, FilingPeriod>();
  if (codes.length === 0) return result;
  const latest =
    (await prisma.filing.findMany({
      where: { businessId, stateCode: { in: codes } },
      orderBy: { periodStart: 'desc' },
      distinct: ['stateCode'],
      select: { stateCode: true, period: true },
    })) ?? [];
  const byState = new Map(latest.map((f) => [f.stateCode.toUpperCase(), f.period]));
  for (const code of codes) {
    const period = byState.get(code);
    result.set(code, period && isPeriod(period) && offeredFilingPeriods(code).includes(period) ? period : resolveFilingPeriod(code));
  }
  return result;
}

/**
 * Create the state's returns for the period in progress (and any that ended
 * but aren't due yet) at `period`, skipping any that overlap a return the
 * state already has — for example a quarter filed before switching to
 * monthly. Returns how many were created.
 */
async function createCurrentFilings(
  businessId: string,
  state: NexusStateRef,
  period: FilingPeriod | undefined,
  now: Date
): Promise<number> {
  const stateCode = state.stateCode.toUpperCase();
  const deadlines = getCurrentDeadlines(stateCode, now, period);
  if (deadlines.length === 0) return 0;
  const earliest = new Date(Math.min(...deadlines.map((d) => d.periodStart.getTime())));
  // A copy: returns created below are added to it
  const existing = [
    ...((await prisma.filing.findMany({
      where: { businessId, stateCode, periodEnd: { gte: earliest } },
      select: { periodStart: true, periodEnd: true },
    })) ?? []),
  ];
  let created = 0;
  for (const deadline of deadlines) {
    const overlaps = existing.some(
      (e) => e.periodStart.getTime() <= deadline.periodEnd.getTime() && e.periodEnd.getTime() >= deadline.periodStart.getTime()
    );
    if (overlaps) continue;
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
      existing.push({ periodStart: deadline.periodStart, periodEnd: deadline.periodEnd });
      created++;
    } catch (error) {
      // Unique (businessId, stateCode, periodStart): another request created it first
      if (!(error instanceof Error && /Unique constraint/i.test(error.message))) throw error;
    }
  }
  return created;
}

/**
 * Make sure each nexus state has a filing for the period in progress and for
 * any period that ended but isn't due yet, at the frequency the state's
 * calendar follows. Returns how many filings were created.
 */
export async function ensureCurrentFilings(
  businessId: string,
  states: NexusStateRef[],
  now: Date = new Date()
): Promise<number> {
  const frequencies = await getFilingFrequencies(
    businessId,
    states.map((s) => s.stateCode)
  );
  let created = 0;
  for (const state of states) {
    created += await createCurrentFilings(businessId, state, frequencies.get(state.stateCode.toUpperCase()), now);
  }
  return created;
}

/**
 * Switch a state's calendar to `period`: remove its upcoming unfiled returns
 * at other frequencies (not yet due), then create the current ones at the new
 * frequency. Filed and overdue returns are kept.
 */
export async function setFilingFrequency(
  businessId: string,
  state: NexusStateRef,
  period: FilingPeriod,
  now: Date = new Date()
): Promise<{ removed: number; created: number }> {
  const stateCode = state.stateCode.toUpperCase();
  if (!offeredFilingPeriods(stateCode).includes(period)) {
    throw new Error(`${state.stateName} doesn't offer ${period} filing`);
  }
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const removed = await prisma.filing.deleteMany({
    where: { businessId, stateCode, status: 'pending', dueDate: { gte: startOfToday }, NOT: { period } },
  });
  const created = await createCurrentFilings(businessId, { stateCode, stateName: state.stateName }, period, now);
  return { removed: removed.count, created };
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

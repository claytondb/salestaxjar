import { describe, it, expect } from 'vitest';
import {
  calculateDueDate,
  getMonthlyPeriods,
  getQuarterlyPeriods,
  getAnnualPeriod,
  getFilingDeadlines,
  getRemainingDeadlines,
  getStateFilingConfig,
  getFilingScheduleSummary,
  getCurrentDeadlines,
  resolveFilingPeriod,
  isYearComplete,
  STATE_FILING_CONFIGS,
} from './filing-deadlines';

/** "2026-04-20" for a local date */
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// calculateDueDate
// ---------------------------------------------------------------------------
describe('calculateDueDate', () => {
  it('returns the 20th of the following month', () => {
    const periodEnd = new Date(2026, 2, 31); // March 31
    const due = calculateDueDate(periodEnd, 20);
    expect(due.getFullYear()).toBe(2026);
    expect(due.getMonth()).toBe(3); // April (0-indexed)
    expect(due.getDate()).toBe(20);
  });

  it('wraps correctly at December → January', () => {
    const periodEnd = new Date(2026, 11, 31); // December 31
    const due = calculateDueDate(periodEnd, 20);
    expect(due.getFullYear()).toBe(2027);
    expect(due.getMonth()).toBe(0); // January
    expect(due.getDate()).toBe(20);
  });

  it('clamps to last day of month when day exceeds month length', () => {
    // February 28 + 3 days = period ending Feb 28; due on 31st → clamp to Feb 28 (next: March 31)
    // Actually the following month is March which has 31 days; 31st is fine
    const periodEnd = new Date(2026, 1, 28); // February 28 (non-leap)
    const due = calculateDueDate(periodEnd, 31);
    expect(due.getMonth()).toBe(2); // March
    expect(due.getDate()).toBe(31);
  });

  it('clamps day 31 to Feb 28 in non-leap year', () => {
    // Period ending in January → due in February (28 days in non-leap 2026)
    const periodEnd = new Date(2026, 0, 31); // January 31
    const due = calculateDueDate(periodEnd, 31);
    expect(due.getMonth()).toBe(1); // February
    expect(due.getDate()).toBe(28); // clamped
  });

  it('allows day 29 in leap-year February', () => {
    const periodEnd = new Date(2028, 0, 31); // January 31, 2028 (2028 is leap)
    const due = calculateDueDate(periodEnd, 31);
    expect(due.getMonth()).toBe(1); // February
    expect(due.getDate()).toBe(29); // leap year
  });
});

// ---------------------------------------------------------------------------
// getMonthlyPeriods
// ---------------------------------------------------------------------------
describe('getMonthlyPeriods', () => {
  it('returns 12 periods for a year', () => {
    const periods = getMonthlyPeriods(2026);
    expect(periods).toHaveLength(12);
  });

  it('first period is January 1 – January 31', () => {
    const [jan] = getMonthlyPeriods(2026);
    expect(jan.periodStart).toEqual(new Date(2026, 0, 1));
    expect(jan.periodEnd).toEqual(new Date(2026, 0, 31));
    expect(jan.period).toBe('monthly');
    expect(jan.periodLabel).toBe('January 2026');
  });

  it('last period is December 1 – December 31', () => {
    const periods = getMonthlyPeriods(2026);
    const dec = periods[11];
    expect(dec.periodStart).toEqual(new Date(2026, 11, 1));
    expect(dec.periodEnd).toEqual(new Date(2026, 11, 31));
    expect(dec.periodLabel).toBe('December 2026');
  });

  it('February has correct period end in non-leap year', () => {
    const periods = getMonthlyPeriods(2026);
    const feb = periods[1];
    expect(feb.periodEnd).toEqual(new Date(2026, 1, 28));
  });

  it('February has correct period end in leap year', () => {
    const periods = getMonthlyPeriods(2028);
    const feb = periods[1];
    expect(feb.periodEnd).toEqual(new Date(2028, 1, 29));
  });

  it('each period due date is in the following month', () => {
    const periods = getMonthlyPeriods(2026);
    for (const p of periods) {
      // Due month should be one after period end month (wrapping Dec → Jan)
      const expectedDueMonth = (p.periodEnd.getMonth() + 1) % 12;
      expect(p.dueDate.getMonth()).toBe(expectedDueMonth);
    }
  });

  it('respects custom dueDayOfMonth', () => {
    const periods = getMonthlyPeriods(2026, 15);
    expect(periods[0].dueDate.getDate()).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// getQuarterlyPeriods
// ---------------------------------------------------------------------------
describe('getQuarterlyPeriods', () => {
  it('returns 4 periods', () => {
    const periods = getQuarterlyPeriods(2026);
    expect(periods).toHaveLength(4);
  });

  it('Q1 is Jan 1 – Mar 31', () => {
    const [q1] = getQuarterlyPeriods(2026);
    expect(q1.periodStart).toEqual(new Date(2026, 0, 1));
    expect(q1.periodEnd).toEqual(new Date(2026, 2, 31));
    expect(q1.periodLabel).toBe('Q1 2026');
    expect(q1.period).toBe('quarterly');
  });

  it('Q2 is Apr 1 – Jun 30', () => {
    const q2 = getQuarterlyPeriods(2026)[1];
    expect(q2.periodStart).toEqual(new Date(2026, 3, 1));
    expect(q2.periodEnd).toEqual(new Date(2026, 5, 30));
    expect(q2.periodLabel).toBe('Q2 2026');
  });

  it('Q3 is Jul 1 – Sep 30', () => {
    const q3 = getQuarterlyPeriods(2026)[2];
    expect(q3.periodStart).toEqual(new Date(2026, 6, 1));
    expect(q3.periodEnd).toEqual(new Date(2026, 8, 30));
    expect(q3.periodLabel).toBe('Q3 2026');
  });

  it('Q4 is Oct 1 – Dec 31', () => {
    const q4 = getQuarterlyPeriods(2026)[3];
    expect(q4.periodStart).toEqual(new Date(2026, 9, 1));
    expect(q4.periodEnd).toEqual(new Date(2026, 11, 31));
    expect(q4.periodLabel).toBe('Q4 2026');
  });

  it('Q1 due date is in April', () => {
    const [q1] = getQuarterlyPeriods(2026);
    expect(q1.dueDate.getMonth()).toBe(3); // April
  });

  it('Q4 due date is in January of following year', () => {
    const q4 = getQuarterlyPeriods(2026)[3];
    expect(q4.dueDate.getFullYear()).toBe(2027);
    expect(q4.dueDate.getMonth()).toBe(0); // January
  });

  it('respects custom dueDayOfMonth', () => {
    const periods = getQuarterlyPeriods(2026, 25);
    expect(periods[0].dueDate.getDate()).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// getAnnualPeriod
// ---------------------------------------------------------------------------
describe('getAnnualPeriod', () => {
  it('returns a single period covering the full year', () => {
    const p = getAnnualPeriod(2026);
    expect(p.periodStart).toEqual(new Date(2026, 0, 1));
    expect(p.periodEnd).toEqual(new Date(2026, 11, 31));
    expect(p.period).toBe('annual');
    expect(p.periodLabel).toBe('Annual 2026');
  });

  it('due date is in January of the following year', () => {
    const p = getAnnualPeriod(2026);
    expect(p.dueDate.getFullYear()).toBe(2027);
    expect(p.dueDate.getMonth()).toBe(0); // January
    expect(p.dueDate.getDate()).toBe(20);
  });

  it('respects custom dueDayOfMonth', () => {
    const p = getAnnualPeriod(2026, 15);
    expect(p.dueDate.getDate()).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// getStateFilingConfig
// ---------------------------------------------------------------------------
describe('getStateFilingConfig', () => {
  it('returns config for known states', () => {
    const ca = getStateFilingConfig('CA');
    expect(ca.defaultPeriod).toBe('quarterly');
    expect(ca.quarterlyDue).toBe('last');

    const fl = getStateFilingConfig('FL');
    expect(fl.quarterlyDue).toBe(20);
  });

  it('returns default config for unknown state codes', () => {
    const config = getStateFilingConfig('XX');
    expect(config.defaultPeriod).toBe('quarterly');
    expect(config.quarterlyDue).toBe(20);
  });

  it('is case-insensitive', () => {
    const upper = getStateFilingConfig('TX');
    const lower = getStateFilingConfig('tx');
    expect(upper).toEqual(lower);
  });

  it('has configs for all 50 states + DC', () => {
    const statesWithTax = [
      'AL', 'AZ', 'AR', 'CA', 'CO', 'CT', 'FL', 'GA', 'HI', 'ID',
      'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI',
      'MN', 'MS', 'MO', 'NE', 'NV', 'NJ', 'NM', 'NY', 'NC', 'ND',
      'OH', 'OK', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
      'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
    ];
    for (const code of statesWithTax) {
      const config = STATE_FILING_CONFIGS[code];
      expect(config, `Missing config for ${code}`).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// getFilingDeadlines
// ---------------------------------------------------------------------------
describe('getFilingDeadlines', () => {
  it('returns quarterly periods by default for most states', () => {
    const deadlines = getFilingDeadlines('TX', 2026);
    expect(deadlines).toHaveLength(4);
    expect(deadlines[0].period).toBe('quarterly');
  });

  it('respects periodOverride to force monthly', () => {
    const deadlines = getFilingDeadlines('TX', 2026, 'monthly');
    expect(deadlines).toHaveLength(12);
    expect(deadlines[0].period).toBe('monthly');
  });

  it('respects periodOverride to force annual', () => {
    const deadlines = getFilingDeadlines('TX', 2026, 'annual');
    expect(deadlines).toHaveLength(1);
    expect(deadlines[0].period).toBe('annual');
  });

  it('uses state-specific due date config', () => {
    // CA uses day 31
    const [q1] = getFilingDeadlines('CA', 2026);
    expect(q1.dueDate.getDate()).toBe(30); // April has 30 days, 31 clamps to 30
  });

  it('TX quarterly Q4 due date is January 20, 2027', () => {
    const q4 = getFilingDeadlines('TX', 2026)[3];
    expect(q4.dueDate.getFullYear()).toBe(2027);
    expect(q4.dueDate.getMonth()).toBe(0);
    expect(q4.dueDate.getDate()).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// getRemainingDeadlines
// ---------------------------------------------------------------------------
describe('getRemainingDeadlines', () => {
  it('returns all deadlines when referenceDate is before the year starts', () => {
    const ref = new Date(2025, 11, 31);
    const remaining = getRemainingDeadlines('TX', 2026, undefined, ref);
    expect(remaining).toHaveLength(4);
  });

  it('filters out past periods mid-year', () => {
    // Reference date: July 15, 2026
    const ref = new Date(2026, 6, 15);
    const remaining = getRemainingDeadlines('TX', 2026, undefined, ref);
    // Q1 (Jan-Mar) and Q2 (Apr-Jun) period ends have passed, but Q2 due date (Jul 20) hasn't
    // Q2 dueDate = July 20 > July 15, so Q2 is still included
    // Q1 dueDate = April 20 < July 15, period end = March 31 < July 15 → filtered
    expect(remaining.length).toBeGreaterThan(0);
    // Q3 and Q4 should always be included
    const labels = remaining.map(d => d.periodLabel);
    expect(labels).toContain('Q3 2026');
    expect(labels).toContain('Q4 2026');
  });

  it('returns empty array when reference is after year end and all due dates passed', () => {
    const ref = new Date(2028, 6, 1); // Mid-2028, well after 2026
    const remaining = getRemainingDeadlines('TX', 2026, undefined, ref);
    expect(remaining).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// isYearComplete
// ---------------------------------------------------------------------------
describe('isYearComplete', () => {
  it('returns false when year is current', () => {
    const ref = new Date(2026, 5, 15);
    expect(isYearComplete(2026, ref)).toBe(false);
  });

  it('returns true when reference is past Dec 31 of that year', () => {
    const ref = new Date(2027, 0, 1);
    expect(isYearComplete(2026, ref)).toBe(true);
  });

  it('returns false on Dec 31 of the same year', () => {
    const ref = new Date(2026, 11, 31);
    expect(isYearComplete(2026, ref)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getFilingScheduleSummary
// ---------------------------------------------------------------------------
describe('getFilingScheduleSummary', () => {
  it('returns a readable string for a known state', () => {
    const summary = getFilingScheduleSummary('TX');
    expect(summary).toContain('Quarterly');
    expect(summary).toContain('20');
  });

  it('returns a readable string for California', () => {
    const summary = getFilingScheduleSummary('CA');
    expect(summary).toBe('Quarterly · due the last day of the following month');
  });

  it('describes New York quarters, monthly-only states, and non-January annual returns', () => {
    expect(getFilingScheduleSummary('NY')).toBe('Quarterly (Mar–May, Jun–Aug, Sep–Nov, Dec–Feb) · due the 20th of the following month');
    expect(getFilingScheduleSummary('OH')).toBe('Monthly · due the 23rd of the following month');
    expect(getFilingScheduleSummary('WA', 'annual')).toBe('Annual · due April 15');
    expect(getFilingScheduleSummary('DC', 'annual')).toBe('Annual (October–September year) · due October 20');
    expect(getFilingScheduleSummary('OR')).toBe('No state sales tax returns');
  });

  it('returns a readable string for an unknown state', () => {
    const summary = getFilingScheduleSummary('ZZ');
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Period boundary sanity checks
// ---------------------------------------------------------------------------
describe('period boundary integrity', () => {
  it('quarterly period ends are valid dates', () => {
    const periods = getQuarterlyPeriods(2026);
    for (const p of periods) {
      expect(p.periodEnd).toBeInstanceOf(Date);
      expect(isNaN(p.periodEnd.getTime())).toBe(false);
    }
  });

  it('monthly periods for leap year have correct Feb end', () => {
    const [, feb] = getMonthlyPeriods(2024);
    expect(feb.periodEnd.getDate()).toBe(29);
  });

  it('all quarterly periods in 2026 span exactly 3 months', () => {
    const periods = getQuarterlyPeriods(2026);
    for (const p of periods) {
      const startMonth = p.periodStart.getMonth();
      const endMonth = p.periodEnd.getMonth();
      expect((endMonth - startMonth + 12) % 12).toBe(2);
    }
  });

  it('monthly due dates are in consecutive months', () => {
    const periods = getMonthlyPeriods(2026);
    for (const p of periods) {
      const periodEndMonth = p.periodEnd.getMonth();
      const dueDateMonth = p.dueDate.getMonth();
      expect((dueDateMonth - periodEndMonth + 12) % 12).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// State rules checked against each state's revenue department (Sept 2026)
// ---------------------------------------------------------------------------
describe('state due dates', () => {
  const quarterDue = (state: string, year = 2026) => getFilingDeadlines(state, year, 'quarterly').map((d) => ymd(d.dueDate));

  it('Nevada returns are due the 20th starting in 2026', () => {
    expect(quarterDue('NV')).toEqual(['2026-04-20', '2026-07-20', '2026-10-20', '2027-01-20']);
  });

  it('Massachusetts returns are due the 30th', () => {
    expect(quarterDue('MA')).toEqual(['2026-04-30', '2026-07-30', '2026-10-30', '2027-01-30']);
  });

  it('quarterly returns due the last day of the next month: CA, CT, MO, NC, ND, RI, UT, WA, WI, WY', () => {
    for (const state of ['CA', 'CT', 'MO', 'NC', 'ND', 'RI', 'UT', 'WA', 'WI', 'WY']) {
      expect({ state, due: quarterDue(state) }).toEqual({ state, due: ['2026-04-30', '2026-07-31', '2026-10-31', '2027-01-31'] });
    }
  });

  it('North Carolina and Rhode Island monthly returns are due the 20th, unlike their quarterly ones', () => {
    expect(ymd(getFilingDeadlines('NC', 2026, 'monthly')[0].dueDate)).toBe('2026-02-20');
    expect(ymd(getFilingDeadlines('RI', 2026, 'monthly')[0].dueDate)).toBe('2026-02-20');
  });

  it('other due days: Kansas, New Mexico and Vermont the 25th, Maine the 15th', () => {
    expect(quarterDue('KS')[0]).toBe('2026-04-25');
    expect(quarterDue('NM')[0]).toBe('2026-04-25');
    expect(quarterDue('VT')[0]).toBe('2026-04-25');
    expect(quarterDue('ME')[0]).toBe('2026-04-15');
  });

  it("Vermont's January monthly return is due February 23", () => {
    const vt = getFilingDeadlines('VT', 2026, 'monthly');
    expect(ymd(vt[0].dueDate)).toBe('2026-02-23');
    expect(ymd(vt[1].dueDate)).toBe('2026-03-25');
  });

  it("Washington: monthly the 25th, quarterly the last day, annual April 15", () => {
    expect(ymd(getFilingDeadlines('WA', 2026, 'monthly')[0].dueDate)).toBe('2026-02-25');
    expect(quarterDue('WA')[0]).toBe('2026-04-30');
    expect(ymd(getFilingDeadlines('WA', 2026, 'annual')[0].dueDate)).toBe('2027-04-15');
  });

  it("New York's quarters run Mar–May, Jun–Aug, Sep–Nov and Dec–Feb, due the 20th", () => {
    const ny = getFilingDeadlines('NY', 2026);
    expect(ny.map((d) => [d.periodLabel, ymd(d.periodStart), ymd(d.periodEnd), ymd(d.dueDate)])).toEqual([
      ['Dec 2025–Feb 2026', '2025-12-01', '2026-02-28', '2026-03-20'],
      ['Mar–May 2026', '2026-03-01', '2026-05-31', '2026-06-20'],
      ['Jun–Aug 2026', '2026-06-01', '2026-08-31', '2026-09-20'],
      ['Sep–Nov 2026', '2026-09-01', '2026-11-30', '2026-12-20'],
    ]);
  });

  it("New York's annual period runs March–February, due March 20", () => {
    const [ny] = getFilingDeadlines('NY', 2026, 'annual');
    expect([ymd(ny.periodStart), ymd(ny.periodEnd), ymd(ny.dueDate)]).toEqual(['2025-03-01', '2026-02-28', '2026-03-20']);
  });

  it("DC's annual period runs October–September, due October 20", () => {
    const [dc] = getFilingDeadlines('DC', 2026, 'annual');
    expect([ymd(dc.periodStart), ymd(dc.periodEnd), ymd(dc.dueDate)]).toEqual(['2025-10-01', '2026-09-30', '2026-10-20']);
  });

  it('annual returns not due in January: Michigan Feb 28, Minnesota Feb 5', () => {
    expect(ymd(getFilingDeadlines('MI', 2026, 'annual')[0].dueDate)).toBe('2027-02-28');
    expect(ymd(getFilingDeadlines('MN', 2026, 'annual')[0].dueDate)).toBe('2027-02-05');
  });

  it('Indiana, Iowa, Ohio and Oklahoma have no quarterly filing, so Sails uses monthly', () => {
    for (const state of ['IN', 'IA', 'OH', 'OK']) {
      expect(resolveFilingPeriod(state)).toBe('monthly');
      expect(resolveFilingPeriod(state, 'quarterly')).toBe('monthly');
      expect(getFilingDeadlines(state, 2026)).toHaveLength(12);
    }
    expect(ymd(getFilingDeadlines('OH', 2026)[0].dueDate)).toBe('2026-02-23');
    expect(ymd(getFilingDeadlines('IA', 2026)[0].dueDate)).toBe('2026-02-28');
    expect(ymd(getFilingDeadlines('IN', 2026)[2].dueDate)).toBe('2026-04-30');
  });

  it('falls back to the default frequency where a state has no annual filing', () => {
    for (const state of ['LA', 'NJ', 'NM', 'NC', 'PA', 'RI', 'VA']) {
      expect({ state, period: resolveFilingPeriod(state, 'annual') }).toEqual({ state, period: 'quarterly' });
    }
  });

  it('has no returns for states without a state sales tax', () => {
    for (const state of ['AK', 'DE', 'MT', 'NH', 'OR']) {
      expect(getFilingDeadlines(state, 2026)).toEqual([]);
    }
  });
});

describe('getCurrentDeadlines', () => {
  it('returns the quarter in progress', () => {
    const current = getCurrentDeadlines('TX', new Date(2026, 8, 25));
    expect(current.map((d) => d.periodLabel)).toEqual(['Q3 2026']);
  });

  it('includes a quarter that ended but is not due yet', () => {
    const current = getCurrentDeadlines('TX', new Date(2026, 9, 5));
    expect(current.map((d) => [d.periodLabel, ymd(d.dueDate)])).toEqual([
      ['Q3 2026', '2026-10-20'],
      ['Q4 2026', '2027-01-20'],
    ]);
  });

  it('still includes a return on its due date', () => {
    const current = getCurrentDeadlines('TX', new Date(2026, 9, 20, 15, 0));
    expect(current.map((d) => d.periodLabel)).toContain('Q3 2026');
  });

  it("looks across the year boundary (New York's Dec–Feb quarter)", () => {
    const current = getCurrentDeadlines('NY', new Date(2026, 11, 25));
    expect(current.map((d) => [d.periodLabel, ymd(d.dueDate)])).toEqual([['Dec 2026–Feb 2027', '2027-03-20']]);
  });
});

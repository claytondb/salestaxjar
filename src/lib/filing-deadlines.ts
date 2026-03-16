/**
 * Filing Deadline Utilities
 *
 * Generates sales tax filing periods and due dates for US states.
 * Supports monthly, quarterly, and annual filing frequencies.
 *
 * Due date conventions:
 * - Most states: 20th of the month following the period end
 * - Some states use different due days (see STATE_DUE_DAY_OVERRIDES)
 *
 * Note: Actual due dates vary by state and can change. Always verify with
 * the state's department of revenue before filing.
 */

export type FilingPeriod = 'monthly' | 'quarterly' | 'annual';

export interface FilingDeadline {
  period: FilingPeriod;
  periodLabel: string; // e.g. "Q1 2026", "January 2026", "Annual 2026"
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
}

export interface StateFilingConfig {
  /** Default filing frequency for this state */
  defaultPeriod: FilingPeriod;
  /** Day of month the return is due after the period ends (default: 20) */
  dueDayOfMonth: number;
  /**
   * True if the due date is in the same month as period end rather than
   * the following month (rare, e.g. some annual filers).
   */
  dueInSameMonth?: boolean;
}

/**
 * Per-state filing configuration defaults.
 * Most states use quarterly + 20th of following month.
 * Overrides are noted inline.
 */
export const STATE_FILING_CONFIGS: Record<string, StateFilingConfig> = {
  AL: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  AK: { defaultPeriod: 'annual', dueDayOfMonth: 15 }, // No statewide tax; local only
  AZ: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  AR: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  CA: { defaultPeriod: 'quarterly', dueDayOfMonth: 31 }, // CA uses last day of month following period
  CO: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  CT: { defaultPeriod: 'quarterly', dueDayOfMonth: 31 },
  DE: { defaultPeriod: 'annual', dueDayOfMonth: 20 }, // No sales tax
  FL: { defaultPeriod: 'quarterly', dueDayOfMonth: 19 }, // Florida: 19th
  GA: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  HI: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  ID: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  IL: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  IN: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  IA: { defaultPeriod: 'quarterly', dueDayOfMonth: 31 },
  KS: { defaultPeriod: 'quarterly', dueDayOfMonth: 25 },
  KY: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  LA: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  ME: { defaultPeriod: 'quarterly', dueDayOfMonth: 15 },
  MD: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  MA: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  MI: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  MN: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  MS: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  MO: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  MT: { defaultPeriod: 'annual', dueDayOfMonth: 20 }, // No sales tax
  NE: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  NV: { defaultPeriod: 'quarterly', dueDayOfMonth: 15 },
  NH: { defaultPeriod: 'annual', dueDayOfMonth: 20 }, // No sales tax
  NJ: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  NM: { defaultPeriod: 'quarterly', dueDayOfMonth: 25 },
  NY: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  NC: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  ND: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  OH: { defaultPeriod: 'quarterly', dueDayOfMonth: 23 },
  OK: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  OR: { defaultPeriod: 'annual', dueDayOfMonth: 20 }, // No sales tax
  PA: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  RI: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  SC: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  SD: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  TN: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  TX: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  UT: { defaultPeriod: 'quarterly', dueDayOfMonth: 31 },
  VT: { defaultPeriod: 'quarterly', dueDayOfMonth: 25 },
  VA: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  WA: { defaultPeriod: 'quarterly', dueDayOfMonth: 31 },
  WV: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  WI: { defaultPeriod: 'quarterly', dueDayOfMonth: 31 },
  WY: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
  DC: { defaultPeriod: 'quarterly', dueDayOfMonth: 20 },
};

const DEFAULT_CONFIG: StateFilingConfig = {
  defaultPeriod: 'quarterly',
  dueDayOfMonth: 20,
};

/**
 * Get the filing configuration for a state, with defaults.
 */
export function getStateFilingConfig(stateCode: string): StateFilingConfig {
  return STATE_FILING_CONFIGS[stateCode.toUpperCase()] ?? DEFAULT_CONFIG;
}

/**
 * Calculate the due date: `dueDayOfMonth` of the month following `periodEnd`.
 * Clamps to the last day of the month if the day exceeds the month's length.
 */
export function calculateDueDate(periodEnd: Date, dueDayOfMonth: number): Date {
  const followingMonth = new Date(
    periodEnd.getFullYear(),
    periodEnd.getMonth() + 1, // next month (0-indexed, so this is correct)
    1,
  );
  // Clamp day to last day of following month
  const lastDayOfFollowingMonth = new Date(
    followingMonth.getFullYear(),
    followingMonth.getMonth() + 1,
    0,
  ).getDate();
  const day = Math.min(dueDayOfMonth, lastDayOfFollowingMonth);
  return new Date(followingMonth.getFullYear(), followingMonth.getMonth(), day);
}

/**
 * Generate all monthly filing deadlines for a given year.
 * Returns 12 periods (Jan–Dec), each due on `dueDayOfMonth` of the next month.
 */
export function getMonthlyPeriods(year: number, dueDayOfMonth = 20): FilingDeadline[] {
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return MONTH_NAMES.map((name, i) => {
    const periodStart = new Date(year, i, 1);
    const periodEnd = new Date(year, i + 1, 0); // last day of month
    const dueDate = calculateDueDate(periodEnd, dueDayOfMonth);
    return {
      period: 'monthly',
      periodLabel: `${name} ${year}`,
      periodStart,
      periodEnd,
      dueDate,
    };
  });
}

/**
 * Generate all quarterly filing deadlines for a given year.
 * Returns 4 periods (Q1–Q4), each due on `dueDayOfMonth` of the month after the quarter.
 */
export function getQuarterlyPeriods(year: number, dueDayOfMonth = 20): FilingDeadline[] {
  const quarters = [
    { label: `Q1 ${year}`, startMonth: 0, endMonth: 2 },
    { label: `Q2 ${year}`, startMonth: 3, endMonth: 5 },
    { label: `Q3 ${year}`, startMonth: 6, endMonth: 8 },
    { label: `Q4 ${year}`, startMonth: 9, endMonth: 11 },
  ];

  return quarters.map(({ label, startMonth, endMonth }) => {
    const periodStart = new Date(year, startMonth, 1);
    const periodEnd = new Date(year, endMonth + 1, 0); // last day of last month in quarter
    const dueDate = calculateDueDate(periodEnd, dueDayOfMonth);
    return {
      period: 'quarterly',
      periodLabel: label,
      periodStart,
      periodEnd,
      dueDate,
    };
  });
}

/**
 * Generate the annual filing deadline for a given year.
 * The full year runs Jan 1 – Dec 31, due on `dueDayOfMonth` of January the following year.
 */
export function getAnnualPeriod(year: number, dueDayOfMonth = 20): FilingDeadline {
  const periodStart = new Date(year, 0, 1);
  const periodEnd = new Date(year, 11, 31);
  const dueDate = calculateDueDate(periodEnd, dueDayOfMonth);
  return {
    period: 'annual',
    periodLabel: `Annual ${year}`,
    periodStart,
    periodEnd,
    dueDate,
  };
}

/**
 * Get all filing deadlines for a state and year, using that state's
 * default filing frequency and due-day configuration.
 *
 * You can override `period` to force a specific frequency.
 */
export function getFilingDeadlines(
  stateCode: string,
  year: number,
  periodOverride?: FilingPeriod,
): FilingDeadline[] {
  const config = getStateFilingConfig(stateCode);
  const period = periodOverride ?? config.defaultPeriod;
  const { dueDayOfMonth } = config;

  switch (period) {
    case 'monthly':
      return getMonthlyPeriods(year, dueDayOfMonth);
    case 'quarterly':
      return getQuarterlyPeriods(year, dueDayOfMonth);
    case 'annual':
      return [getAnnualPeriod(year, dueDayOfMonth)];
    default:
      return getQuarterlyPeriods(year, dueDayOfMonth);
  }
}

/**
 * Get only the remaining (future or current) filing deadlines for a state/year,
 * based on the given reference date (defaults to today).
 */
export function getRemainingDeadlines(
  stateCode: string,
  year: number,
  periodOverride?: FilingPeriod,
  referenceDate: Date = new Date(),
): FilingDeadline[] {
  const all = getFilingDeadlines(stateCode, year, periodOverride);
  // Include periods that haven't ended yet, or have ended but due date hasn't passed
  return all.filter(d => d.periodEnd >= referenceDate || d.dueDate >= referenceDate);
}

/**
 * Check whether a given year is fully in the past relative to `referenceDate`.
 */
export function isYearComplete(year: number, referenceDate: Date = new Date()): boolean {
  return referenceDate > new Date(year, 11, 31);
}

/**
 * Get a human-readable summary of the filing schedule for a state.
 */
export function getFilingScheduleSummary(stateCode: string): string {
  const config = getStateFilingConfig(stateCode);
  const periodLabel = config.defaultPeriod.charAt(0).toUpperCase() + config.defaultPeriod.slice(1);
  return `${periodLabel} · due on the ${config.dueDayOfMonth}${ordinal(config.dueDayOfMonth)} of the following month`;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0] ?? 'th';
}

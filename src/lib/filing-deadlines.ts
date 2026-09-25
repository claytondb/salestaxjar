/**
 * Filing Deadline Utilities
 *
 * Sales tax filing periods and due dates for US states: monthly, quarterly
 * and annual, each with the state's own due day.
 *
 * Due dates were checked against each state revenue agency's website in
 * September 2026 (see FILING_RULES_REVIEWED). Notable rules:
 * - New York's quarters run Mar–May, Jun–Aug, Sep–Nov and Dec–Feb.
 * - Nevada moved its due date to the 20th starting with January 2026.
 * - Massachusetts returns are due on the 30th.
 * - Indiana, Iowa, Ohio and Oklahoma don't offer quarterly filing.
 * - Some annual returns aren't due in January (Michigan Feb 28, Minnesota
 *   Feb 5, Washington Apr 15) or cover a non-calendar year (DC Oct–Sep,
 *   New York Mar–Feb).
 *
 * Dates are the nominal due dates. Most states move a due date that falls on
 * a weekend or holiday to the next business day; Sails doesn't, so its dates
 * are never later than the real ones. States assign each business its filing
 * frequency, so the frequency here is Sails' best guess for a small seller
 * until the seller says otherwise.
 */

export type FilingPeriod = 'monthly' | 'quarterly' | 'annual';

export interface FilingDeadline {
  period: FilingPeriod;
  periodLabel: string; // e.g. "Q1 2026", "January 2026", "Annual 2026", "Mar–May 2026"
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
}

/** Day of the month the return is due; 'last' = the last day of that month. */
export type DueDay = number | 'last';

export interface AnnualSchedule {
  /** Month (0 = January) the annual period starts. 0 = calendar year. */
  startMonth: number;
  /** How many months after the period ends the return is due (1 = the next month). */
  monthsAfter: number;
  day: DueDay;
}

export interface StateFilingConfig {
  /** The frequency Sails assumes for a small seller until told otherwise */
  defaultPeriod: FilingPeriod;
  /** Due day in the month after a monthly period */
  monthlyDue: DueDay;
  /** Due day in the month after a quarter; undefined = the state has no quarterly filing */
  quarterlyDue?: DueDay;
  /** Annual filing; undefined = the state has no annual filing */
  annual?: AnnualSchedule;
  /** First month (0 = January) of a quarter. 0 = calendar quarters; New York uses 2 (Mar–May). */
  quarterStartMonth?: number;
  /** Monthly due-day exceptions by the month of the period (0 = January) */
  monthlyDueExceptions?: Record<number, DueDay>;
  /** No statewide sales tax, so no state returns */
  noStateSalesTax?: boolean;
  /** A short note about anything unusual, shown with the schedule */
  note?: string;
}

/** When the due dates below were last checked against the states' own sites. */
export const FILING_RULES_REVIEWED = '2026-09-25';

const JAN = (day: DueDay): AnnualSchedule => ({ startMonth: 0, monthsAfter: 1, day });

/**
 * Per-state filing rules. Sources: each state's department of revenue
 * (filing frequency / due date pages, return instructions, tax calendars).
 */
export const STATE_FILING_CONFIGS: Record<string, StateFilingConfig> = {
  AL: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 20, annual: JAN(20) },
  AK: {
    defaultPeriod: 'monthly',
    monthlyDue: 'last',
    noStateSalesTax: true,
    note: 'Alaska has no state sales tax. Sellers registered with the Alaska Remote Seller Sales Tax Commission file with the Commission.',
  },
  AZ: {
    defaultPeriod: 'quarterly',
    monthlyDue: 20,
    quarterlyDue: 20,
    annual: JAN(20),
    note: 'Returns filed electronically are on time through the last business day of the month.',
  },
  AR: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 20, annual: JAN(20) },
  CA: { defaultPeriod: 'quarterly', monthlyDue: 'last', quarterlyDue: 'last', annual: JAN('last') },
  CO: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 20, annual: JAN(20) },
  CT: { defaultPeriod: 'quarterly', monthlyDue: 'last', quarterlyDue: 'last', annual: JAN('last') },
  DE: { defaultPeriod: 'annual', monthlyDue: 20, noStateSalesTax: true },
  FL: {
    defaultPeriod: 'quarterly',
    monthlyDue: 20,
    quarterlyDue: 20,
    annual: JAN(20),
    note: 'Late after the 20th. Electronic payments must be started by 5 p.m. ET on the business day before the 20th.',
  },
  GA: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 20, annual: JAN(20) },
  HI: {
    defaultPeriod: 'quarterly',
    monthlyDue: 20,
    quarterlyDue: 20,
    note: 'Everyone also files an annual reconciliation (Form G-49), due April 20.',
  },
  ID: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 20, annual: JAN(20) },
  IL: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 20, annual: JAN(20) },
  IN: {
    defaultPeriod: 'monthly',
    monthlyDue: 30,
    annual: JAN('last'),
    note: 'No quarterly filing. Monthly returns are due the 30th, or the 20th if you average more than $1,000 of tax a month.',
  },
  IA: { defaultPeriod: 'monthly', monthlyDue: 'last', annual: JAN('last'), note: 'No quarterly filing.' },
  KS: { defaultPeriod: 'quarterly', monthlyDue: 25, quarterlyDue: 25, annual: JAN(25) },
  KY: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 20, annual: JAN(20) },
  LA: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 20 },
  ME: { defaultPeriod: 'quarterly', monthlyDue: 15, quarterlyDue: 15, annual: JAN(15) },
  MD: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 20, annual: JAN(20) },
  MA: { defaultPeriod: 'quarterly', monthlyDue: 30, quarterlyDue: 30, annual: JAN(30) },
  MI: {
    defaultPeriod: 'quarterly',
    monthlyDue: 20,
    quarterlyDue: 20,
    annual: { startMonth: 0, monthsAfter: 2, day: 28 },
    note: 'Every filer also files an annual return, due February 28.',
  },
  MN: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 20, annual: { startMonth: 0, monthsAfter: 2, day: 5 } },
  MS: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 20, annual: JAN(20) },
  MO: { defaultPeriod: 'quarterly', monthlyDue: 'last', quarterlyDue: 'last', annual: JAN('last') },
  MT: { defaultPeriod: 'annual', monthlyDue: 20, noStateSalesTax: true },
  NE: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 20, annual: JAN(20) },
  NV: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 20, annual: JAN(20) },
  NH: { defaultPeriod: 'annual', monthlyDue: 20, noStateSalesTax: true },
  NJ: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 20 },
  NM: { defaultPeriod: 'quarterly', monthlyDue: 25, quarterlyDue: 25 },
  NY: {
    defaultPeriod: 'quarterly',
    monthlyDue: 20,
    quarterlyDue: 20,
    quarterStartMonth: 2,
    annual: { startMonth: 2, monthsAfter: 1, day: 20 },
    note: "New York's quarters run March–May, June–August, September–November and December–February.",
  },
  NC: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 'last' },
  ND: { defaultPeriod: 'quarterly', monthlyDue: 'last', quarterlyDue: 'last', annual: JAN('last') },
  OH: {
    defaultPeriod: 'monthly',
    monthlyDue: 23,
    note: 'No quarterly filing. Small sellers may be allowed to file twice a year (due July 23 and January 23).',
  },
  OK: {
    defaultPeriod: 'monthly',
    monthlyDue: 20,
    note: 'No quarterly filing. Small sellers may be allowed to file twice a year (due July 20 and January 20).',
  },
  OR: { defaultPeriod: 'annual', monthlyDue: 20, noStateSalesTax: true },
  PA: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 20 },
  RI: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 'last' },
  SC: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 20, annual: JAN(20) },
  SD: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 20 },
  TN: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 20, annual: JAN(20) },
  TX: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 20, annual: JAN(20) },
  UT: { defaultPeriod: 'quarterly', monthlyDue: 'last', quarterlyDue: 'last', annual: JAN('last') },
  VT: {
    defaultPeriod: 'quarterly',
    monthlyDue: 25,
    quarterlyDue: 25,
    annual: JAN(25),
    monthlyDueExceptions: { 0: 23 },
  },
  VA: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 20 },
  WA: {
    defaultPeriod: 'quarterly',
    monthlyDue: 25,
    quarterlyDue: 'last',
    annual: { startMonth: 0, monthsAfter: 4, day: 15 },
  },
  WV: { defaultPeriod: 'quarterly', monthlyDue: 20, quarterlyDue: 20, annual: JAN(20) },
  WI: { defaultPeriod: 'quarterly', monthlyDue: 'last', quarterlyDue: 'last', annual: JAN('last') },
  WY: { defaultPeriod: 'quarterly', monthlyDue: 'last', quarterlyDue: 'last', annual: JAN('last') },
  DC: {
    defaultPeriod: 'quarterly',
    monthlyDue: 20,
    quarterlyDue: 20,
    annual: { startMonth: 9, monthsAfter: 1, day: 20 },
    note: "DC's annual period runs October through September.",
  },
};

const DEFAULT_CONFIG: StateFilingConfig = {
  defaultPeriod: 'quarterly',
  monthlyDue: 20,
  quarterlyDue: 20,
  annual: JAN(20),
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Get the filing configuration for a state, with defaults.
 */
export function getStateFilingConfig(stateCode: string): StateFilingConfig {
  return STATE_FILING_CONFIGS[stateCode.toUpperCase()] ?? DEFAULT_CONFIG;
}

/**
 * The due date: `dueDay` of the month `monthsAfter` months after the month
 * `periodEnd` falls in. A day past the end of that month (or 'last') is the
 * month's last day.
 */
export function calculateDueDate(periodEnd: Date, dueDay: DueDay, monthsAfter = 1): Date {
  const dueMonth = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + monthsAfter, 1);
  const lastDay = new Date(dueMonth.getFullYear(), dueMonth.getMonth() + 1, 0).getDate();
  const day = dueDay === 'last' ? lastDay : Math.min(dueDay, lastDay);
  return new Date(dueMonth.getFullYear(), dueMonth.getMonth(), day);
}

/**
 * All monthly filing periods in a year, each due `dueDay` of the next month.
 */
export function getMonthlyPeriods(
  year: number,
  dueDay: DueDay = 20,
  exceptions: Record<number, DueDay> = {},
): FilingDeadline[] {
  return MONTH_NAMES.map((name, i) => {
    const periodStart = new Date(year, i, 1);
    const periodEnd = new Date(year, i + 1, 0); // last day of month
    return {
      period: 'monthly',
      periodLabel: `${name} ${year}`,
      periodStart,
      periodEnd,
      dueDate: calculateDueDate(periodEnd, exceptions[i] ?? dueDay),
    };
  });
}

/**
 * The four quarters that end in `year`, each due `dueDay` of the month after
 * the quarter. `startMonth` 0 gives calendar quarters (Q1–Q4); New York's
 * quarters start in March, so its first quarter ending in a year is the
 * December–February one.
 */
export function getQuarterlyPeriods(year: number, dueDay: DueDay = 20, startMonth = 0): FilingDeadline[] {
  const calendar = startMonth % 3 === 0;
  const periods: FilingDeadline[] = [];
  for (let q = 0; q < 4; q++) {
    // Month index (can be negative for the Dec–Feb quarter) where each quarter ending in `year` starts
    const firstMonth = calendar ? q * 3 : startMonth - 3 + q * 3;
    const periodStart = new Date(year, firstMonth, 1);
    const periodEnd = new Date(year, firstMonth + 3, 0);
    const label = calendar
      ? `Q${q + 1} ${year}`
      : periodStart.getFullYear() === periodEnd.getFullYear()
        ? `${SHORT_MONTHS[periodStart.getMonth()]}–${SHORT_MONTHS[periodEnd.getMonth()]} ${year}`
        : `${SHORT_MONTHS[periodStart.getMonth()]} ${periodStart.getFullYear()}–${SHORT_MONTHS[periodEnd.getMonth()]} ${periodEnd.getFullYear()}`;
    periods.push({
      period: 'quarterly',
      periodLabel: label,
      periodStart,
      periodEnd,
      dueDate: calculateDueDate(periodEnd, dueDay),
    });
  }
  return periods;
}

/**
 * The annual period that ends in `year`. Calendar-year filers: January 1 –
 * December 31, due in the new year. Non-calendar years (DC, New York) end in
 * `year` and are due that year.
 */
export function getAnnualPeriod(year: number, dueDay: DueDay = 20, schedule?: AnnualSchedule): FilingDeadline {
  const startMonth = schedule?.startMonth ?? 0;
  const periodStart = startMonth === 0 ? new Date(year, 0, 1) : new Date(year - 1, startMonth, 1);
  const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 12, 0);
  const dueDate = calculateDueDate(periodEnd, schedule?.day ?? dueDay, schedule?.monthsAfter ?? 1);
  const label =
    startMonth === 0
      ? `Annual ${year}`
      : `Annual ${SHORT_MONTHS[periodStart.getMonth()]} ${periodStart.getFullYear()}–${SHORT_MONTHS[periodEnd.getMonth()]} ${periodEnd.getFullYear()}`;
  return { period: 'annual', periodLabel: label, periodStart, periodEnd, dueDate };
}

/**
 * The frequency a state actually uses: the requested one if the state offers
 * it, otherwise the state's default.
 */
export function resolveFilingPeriod(stateCode: string, requested?: FilingPeriod): FilingPeriod {
  const config = getStateFilingConfig(stateCode);
  if (!requested) return config.defaultPeriod;
  if (requested === 'quarterly' && config.quarterlyDue === undefined) return config.defaultPeriod;
  if (requested === 'annual' && !config.annual) return config.defaultPeriod;
  return requested;
}

/**
 * All filing deadlines for a state whose periods end in `year`, using the
 * state's filing frequency (or `periodOverride`, if the state offers it).
 * States with no state sales tax have none.
 */
export function getFilingDeadlines(
  stateCode: string,
  year: number,
  periodOverride?: FilingPeriod,
): FilingDeadline[] {
  const config = getStateFilingConfig(stateCode);
  if (config.noStateSalesTax) return [];
  const period = resolveFilingPeriod(stateCode, periodOverride);

  switch (period) {
    case 'monthly':
      return getMonthlyPeriods(year, config.monthlyDue, config.monthlyDueExceptions);
    case 'annual':
      return config.annual ? [getAnnualPeriod(year, config.annual.day, config.annual)] : [];
    case 'quarterly':
    default:
      return getQuarterlyPeriods(year, config.quarterlyDue ?? 20, config.quarterStartMonth ?? 0);
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
 * The returns a seller is working toward right now: periods that have started
 * and whose due date hasn't passed (the one in progress, plus any that ended
 * but aren't due yet). Looks across the year boundary.
 */
export function getCurrentDeadlines(
  stateCode: string,
  referenceDate: Date = new Date(),
  periodOverride?: FilingPeriod,
): FilingDeadline[] {
  const year = referenceDate.getFullYear();
  const startOfDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  return [year - 1, year, year + 1]
    .flatMap((y) => getFilingDeadlines(stateCode, y, periodOverride))
    .filter((d) => d.periodStart <= referenceDate && d.dueDate >= startOfDay)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

/**
 * Check whether a given year is fully in the past relative to `referenceDate`.
 */
export function isYearComplete(year: number, referenceDate: Date = new Date()): boolean {
  return referenceDate > new Date(year, 11, 31);
}

function describeDueDay(day: DueDay): string {
  return day === 'last' ? 'the last day' : `the ${day}${ordinal(day)}`;
}

/**
 * Get a human-readable summary of the filing schedule for a state.
 */
export function getFilingScheduleSummary(stateCode: string, periodOverride?: FilingPeriod): string {
  const config = getStateFilingConfig(stateCode);
  if (config.noStateSalesTax) return 'No state sales tax returns';
  const period = resolveFilingPeriod(stateCode, periodOverride);
  if (period === 'monthly') {
    return `Monthly · due ${describeDueDay(config.monthlyDue)} of the following month`;
  }
  if (period === 'annual' && config.annual) {
    const { startMonth, monthsAfter, day } = config.annual;
    const dueMonth = MONTH_NAMES[(startMonth + 11 + monthsAfter) % 12];
    const dueText = day === 'last' ? `the last day of ${dueMonth}` : `${dueMonth} ${day}`;
    const yearText =
      startMonth === 0 ? '' : ` (${MONTH_NAMES[startMonth]}–${MONTH_NAMES[(startMonth + 11) % 12]} year)`;
    return `Annual${yearText} · due ${dueText}`;
  }
  const quarters =
    (config.quarterStartMonth ?? 0) % 3 === 0 ? '' : ' (Mar–May, Jun–Aug, Sep–Nov, Dec–Feb)';
  return `Quarterly${quarters} · due ${describeDueDay(config.quarterlyDue ?? 20)} of the following month`;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0] ?? 'th';
}

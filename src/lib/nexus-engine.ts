/**
 * Nexus engine — decides, for every state, whether a seller has likely
 * crossed the economic nexus threshold, and explains why, how sure we are,
 * and what to do next.
 *
 * Pure functions only (no database, no network), so the same code runs on the
 * server for connected stores and in the browser for the free CSV scan.
 *
 * Input is monthly sales per state, split into direct (your own store) and
 * marketplace (Amazon, Etsy…) sales, covering the last ~3 calendar years.
 *
 * What it gets right that a naive "sum every order" does not:
 *  - Measurement windows: previous calendar year only (FL, PA…), previous OR
 *    current calendar year (most states), or rolling 12 months (CT, NY, TX…).
 *    Rolling states are checked at every month-end in the past year, so a
 *    crossing isn't forgotten when the window moves on.
 *  - Past exposure: a crossing that obliged you to collect in an earlier year.
 *  - Marketplace sales only count where the state counts them, and a seller
 *    whose sales in a state all went through marketplaces isn't told to
 *    collect tax the marketplace already collects.
 *  - Sales tax the seller collected is never counted as "sales".
 *  - AND-logic states (CT, NY) need both the dollar and the order test.
 *  - It says how sure it is: missing or stale order history, orders a plan
 *    limit kept out, "retail/taxable sales only" states, and results close to
 *    the line all lower confidence.
 *  - States the seller has already marked as registered aren't nagged.
 *
 * Rules come from nexus-thresholds.ts (sourced, dated).
 */

import {
  STATE_NEXUS_THRESHOLDS,
  NEXUS_RULES_SOURCES,
  NEXUS_RULES_REVIEWED_LABEL,
  MEASUREMENT_PERIOD_LABELS,
  COUNTED_SALES_LABELS,
  calculateExposureStatus,
  type NexusThreshold,
  type ExposureStatus,
  type MeasurementPeriod,
  type CountedSales,
} from './nexus-thresholds';

// ─── Inputs ──────────────────────────────────────────────────────────────────

export type SalesChannel = 'direct' | 'marketplace';

/** Platforms where a marketplace facilitator collects the tax for you. */
export const MARKETPLACE_PLATFORMS = ['amazon', 'etsy', 'ebay', 'walmart', 'tiktok', 'tiktok_shop'] as const;

export function channelForPlatform(platform: string): SalesChannel {
  return (MARKETPLACE_PLATFORMS as readonly string[]).includes(platform.toLowerCase()) ? 'marketplace' : 'direct';
}

/** Order statuses that are not real sales and never count. */
export const EXCLUDED_ORDER_STATUSES = ['cancelled', 'refunded', 'failed', 'voided', 'checkout-draft', 'trash'];

/** One order, reduced to what the nexus math needs. */
export interface NexusOrder {
  date: Date;
  /** Two-letter ship-to state (US only). */
  stateCode: string;
  /** Order total including shipping, EXCLUDING any sales tax collected. */
  sales: number;
  channel: SalesChannel;
}

export interface Totals {
  sales: number;
  orders: number;
}

export interface ChannelTotals {
  direct: Totals;
  marketplace: Totals;
}

/** 'YYYY-MM' (UTC) */
export type MonthKey = string;

/** One state's sales by month. */
export type StateMonths = Map<MonthKey, ChannelTotals>;

export interface ChannelCoverage {
  earliest: Date | null;
  latest: Date | null;
}

export interface DataCoverage {
  /** Earliest / latest order in the data (any channel, US states only) */
  earliestOrder: Date | null;
  latestOrder: Date | null;
  direct: ChannelCoverage;
  marketplace: ChannelCoverage;
  hasMarketplaceData: boolean;
  /** Months where a plan's monthly order limit kept some orders out */
  cappedMonths: MonthKey[];
  planOrderLimit: number | null;
}

/** What the seller told Sails about a state (Nexus → Manual tracking). */
export type Registration = 'registered' | 'tracked' | 'none';

/**
 * Where the orders came from, for wording: 'sails' = stores connected to a
 * Sails account; 'files' = exports dropped into the free check.
 */
export type OrderSource = 'sails' | 'files';

export interface EvaluationContext {
  now: Date;
  coverage: DataCoverage;
  registrations?: Map<string, Registration>;
  source?: OrderSource;
}

export function emptyTotals(): Totals {
  return { sales: 0, orders: 0 };
}

export function emptyChannels(): ChannelTotals {
  return { direct: emptyTotals(), marketplace: emptyTotals() };
}

export function emptyCoverage(): DataCoverage {
  return {
    earliestOrder: null,
    latestOrder: null,
    direct: { earliest: null, latest: null },
    marketplace: { earliest: null, latest: null },
    hasMarketplaceData: false,
    cappedMonths: [],
    planOrderLimit: null,
  };
}

// ─── Month helpers ───────────────────────────────────────────────────────────

export function monthKey(date: Date): MonthKey {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function addMonths(key: MonthKey, n: number): MonthKey {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return monthKey(d);
}

/** Inclusive list of months from start to end. */
export function monthRange(start: MonthKey, end: MonthKey): MonthKey[] {
  const out: MonthKey[] = [];
  for (let k = start; k <= end; k = addMonths(k, 1)) out.push(k);
  return out;
}

function monthStart(key: MonthKey): Date {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

function monthLabel(key: MonthKey): string {
  return monthStart(key).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** First month the engine needs: January two calendar years back. */
export function historyStartMonth(now: Date): MonthKey {
  return `${now.getUTCFullYear() - 2}-01`;
}

/** Group orders into per-state monthly totals (used by the browser CSV scan). */
export function bucketOrders(
  orders: NexusOrder[],
  now: Date
): { byState: Map<string, StateMonths>; coverage: DataCoverage } {
  const byState = new Map<string, StateMonths>();
  const coverage = emptyCoverage();
  const first = historyStartMonth(now);
  const last = monthKey(now);

  const widen = (c: ChannelCoverage, d: Date) => {
    if (!c.earliest || d < c.earliest) c.earliest = d;
    if (!c.latest || d > c.latest) c.latest = d;
  };

  for (const order of orders) {
    const t = order.date.getTime();
    if (Number.isNaN(t) || t > now.getTime()) continue;
    const code = order.stateCode.toUpperCase();
    widen(coverage[order.channel], order.date);
    if (order.channel === 'marketplace') coverage.hasMarketplaceData = true;

    const key = monthKey(order.date);
    if (key < first || key > last) continue;
    let months = byState.get(code);
    if (!months) {
      months = new Map();
      byState.set(code, months);
    }
    let bucket = months.get(key);
    if (!bucket) {
      bucket = emptyChannels();
      months.set(key, bucket);
    }
    bucket[order.channel].sales += Number.isFinite(order.sales) ? order.sales : 0;
    bucket[order.channel].orders += 1;
  }

  finishCoverage(coverage);
  return { byState, coverage };
}

/** Fill the overall earliest/latest from the per-channel values. */
export function finishCoverage(coverage: DataCoverage): DataCoverage {
  const dates = [coverage.direct.earliest, coverage.marketplace.earliest].filter((d): d is Date => !!d);
  const lates = [coverage.direct.latest, coverage.marketplace.latest].filter((d): d is Date => !!d);
  coverage.earliestOrder = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
  coverage.latestOrder = lates.length ? new Date(Math.max(...lates.map((d) => d.getTime()))) : null;
  return coverage;
}

// ─── Outputs ─────────────────────────────────────────────────────────────────

export type Confidence = 'high' | 'medium' | 'low';

export type NextStepKind = 'register_now' | 'plan_registration' | 'past_exposure' | 'review' | 'watch' | 'none';

export interface WindowSummary {
  label: string;
  /** Inclusive month range */
  startMonth: MonthKey;
  endMonth: MonthKey;
  sales: number;
  orders: number;
  directSales: number;
  marketplaceSales: number;
  marketplaceOrders: number;
}

export interface StateEvaluation {
  stateCode: string;
  stateName: string;
  hasSalesTax: boolean;
  /** safe / approaching (75%+) / warning (90%+) / exceeded — drives colors and alerts */
  status: ExposureStatus;
  /** Short plain-language result, e.g. "Over the threshold" */
  headline: string;
  /** One sentence with the numbers that decided the result */
  summaryLine: string;
  measuredSales: number;
  measuredOrders: number;
  salesThreshold: number | null;
  transactionThreshold: number | null;
  logic: 'and' | 'or';
  salesPercentage: number;
  transactionPercentage: number;
  highestPercentage: number;
  /** Which window decided the result */
  window: WindowSummary;
  /** Over the threshold now (in the window the state uses today) */
  overNow: boolean;
  /** Previous-year state crossed this year: registration applies from next January */
  startsNextYear: boolean;
  /** An earlier crossing meant the state expected you to collect in a past period */
  pastExposure: { period: string } | null;
  /** Over, but every counted sale went through marketplaces that already collect */
  marketplaceOnly: boolean;
  /** Alaska-style local threshold crossed (no statewide tax) */
  localNexusOver: boolean;
  registration: Registration;
  marketplace: {
    /** Does this state count marketplace sales toward your threshold? */
    counted: boolean;
    /** Marketplace sales in the deciding window (counted or not) */
    sales: number;
    orders: number;
  };
  /** Month the threshold would be reached at the current pace (calendar-year states) */
  projectedCrossing: string | null;
  why: string[];
  confidence: Confidence;
  confidenceReasons: string[];
  nextStep: { kind: NextStepKind; text: string };
  rule: {
    measurementPeriod: MeasurementPeriod;
    measurementLabel: string;
    measurementNote?: string;
    countedSales: CountedSales;
    countedSalesLabel: string;
    marketplaceSales: 'included' | 'excluded';
    marketplaceNote?: string;
    localNexus?: { salesThreshold: number; body: string; url: string };
    notes: string;
  };
  sources: { name: string; url: string; updated: string }[];
  rulesReviewed: string;
  /** Any sales into this state in the history (marketplace included) */
  hasAnySales: boolean;
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatMoney(amount: number): string {
  return moneyFormatter.format(Math.round(amount));
}

export function formatPercent(pct: number): string {
  return `${Math.min(Math.round(pct), 999)}%`;
}

function formatDay(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

function stripPeriod(text: string): string {
  return text.replace(/\.\s*$/, '');
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// ─── Windows ─────────────────────────────────────────────────────────────────

interface WindowResult extends WindowSummary {
  phrase: string;
  exposure: ReturnType<typeof calculateExposureStatus>;
  exceeded: boolean;
}

function windowResult(
  months: StateMonths,
  start: MonthKey,
  end: MonthKey,
  includeMarketplace: boolean,
  rule: NexusThreshold,
  label: string,
  phrase: string
): WindowResult {
  let directSales = 0;
  let directOrders = 0;
  let marketplaceSales = 0;
  let marketplaceOrders = 0;
  for (const key of monthRange(start, end)) {
    const b = months.get(key);
    if (!b) continue;
    directSales += b.direct.sales;
    directOrders += b.direct.orders;
    marketplaceSales += b.marketplace.sales;
    marketplaceOrders += b.marketplace.orders;
  }
  const sales = directSales + (includeMarketplace ? marketplaceSales : 0);
  const orders = directOrders + (includeMarketplace ? marketplaceOrders : 0);
  const exposure = calculateExposureStatus(sales, orders, rule);
  return {
    label,
    phrase,
    startMonth: start,
    endMonth: end,
    sales,
    orders,
    directSales,
    marketplaceSales,
    marketplaceOrders,
    exposure,
    exceeded: exposure.status === 'exceeded',
  };
}

function toSummary(w: WindowResult): WindowSummary {
  return {
    label: w.label,
    startMonth: w.startMonth,
    endMonth: w.endMonth,
    sales: w.sales,
    orders: w.orders,
    directSales: w.directSales,
    marketplaceSales: w.marketplaceSales,
    marketplaceOrders: w.marketplaceOrders,
  };
}

function highest(windows: WindowResult[]): WindowResult {
  return windows.reduce((best, w) => (w.exposure.highestPercentage > best.exposure.highestPercentage ? w : best));
}

// ─── Evaluation ──────────────────────────────────────────────────────────────

const CONFIDENCE_RANK: Record<Confidence, number> = { high: 2, medium: 1, low: 0 };

function lower(a: Confidence, b: Confidence): Confidence {
  return CONFIDENCE_RANK[a] <= CONFIDENCE_RANK[b] ? a : b;
}

const DAY = 86_400_000;
const STALE_AFTER_DAYS = 45;

/**
 * Evaluate one state.
 *
 * @param rule    the state's nexus rule
 * @param months  the seller's monthly sales into that state (undefined = none)
 * @param ctx     "now", how much order history the data covers, registrations
 */
export function evaluateState(
  rule: NexusThreshold,
  months: StateMonths | undefined,
  ctx: EvaluationContext
): StateEvaluation {
  const { now, coverage } = ctx;
  const fromFiles = ctx.source === 'files';
  const data: StateMonths = months ?? new Map();
  const includeMarketplace = rule.marketplaceSales === 'included';
  const registration: Registration = ctx.registrations?.get(rule.stateCode) ?? 'none';
  const state = rule.stateName;
  const year = now.getUTCFullYear();
  const current = monthKey(now);

  let hasAnySales = false;
  for (const b of data.values()) {
    if (b.direct.orders + b.marketplace.orders > 0) hasAnySales = true;
  }

  const win = (start: MonthKey, end: MonthKey, label: string, phrase: string, r: NexusThreshold = rule, include = includeMarketplace) =>
    windowResult(data, start, end, include, r, label, phrase);

  const currentYear = () => win(`${year}-01`, current, `${year} so far`, `in ${year} so far`);
  const previousYear = () => win(`${year - 1}-01`, `${year - 1}-12`, `${year - 1}`, `in ${year - 1}`);
  const yearBeforePrevious = () => win(`${year - 2}-01`, `${year - 2}-12`, `${year - 2}`, `in ${year - 2}`);
  const trailing = (end: MonthKey) =>
    win(
      addMonths(end, -11),
      end,
      end === current ? 'Last 12 months' : `12 months to ${monthLabel(end)}`,
      end === current ? 'in the last 12 months' : `in the 12 months ending ${monthLabel(end)}`
    );

  const base = {
    stateCode: rule.stateCode,
    stateName: rule.stateName,
    hasSalesTax: rule.hasSalesTax,
    salesThreshold: rule.salesThreshold,
    transactionThreshold: rule.transactionThreshold,
    logic: (rule.logic ?? 'or') as 'and' | 'or',
    registration,
    rule: {
      measurementPeriod: rule.measurementPeriod,
      measurementLabel: MEASUREMENT_PERIOD_LABELS[rule.measurementPeriod],
      measurementNote: rule.measurementNote,
      countedSales: rule.countedSales,
      countedSalesLabel: COUNTED_SALES_LABELS[rule.countedSales],
      marketplaceSales: rule.marketplaceSales,
      marketplaceNote: rule.marketplaceNote,
      localNexus: rule.localNexus,
      notes: rule.notes,
    },
    sources: NEXUS_RULES_SOURCES.map((s) => ({ name: s.name, url: s.url, updated: s.updated })),
    rulesReviewed: NEXUS_RULES_REVIEWED_LABEL,
    hasAnySales,
    projectedCrossing: null as string | null,
  };

  // ── No statewide sales tax ──
  if (!rule.hasSalesTax || !rule.salesThreshold) {
    const w = rule.localNexus
      ? (() => {
          const local: NexusThreshold = { ...rule, salesThreshold: rule.localNexus!.salesThreshold, transactionThreshold: null, hasSalesTax: true };
          const prev = win(`${year - 1}-01`, `${year - 1}-12`, `${year - 1}`, `in ${year - 1}`, local, true);
          const cur = win(`${year}-01`, current, `${year} so far`, `in ${year} so far`, local, true);
          return prev.exceeded || prev.exposure.highestPercentage > cur.exposure.highestPercentage ? prev : cur;
        })()
      : previousYear();
    const localOver = !!rule.localNexus && w.exceeded;
    const why = [`${state} has no statewide sales tax.`];
    if (rule.localNexus) {
      why.push(
        `Many local governments there collect through the ${rule.localNexus.body}, which uses a ${formatMoney(rule.localNexus.salesThreshold)} threshold. Your sales into ${state} ${w.phrase} were ${formatMoney(w.sales)}.`
      );
    }
    return {
      ...base,
      status: localOver ? 'warning' : 'safe',
      headline: localOver ? 'Over the local (ARSSTC) threshold' : 'No state sales tax',
      summaryLine: localOver
        ? `Your sales into ${state} ${w.phrase} were ${formatMoney(w.sales)}, over the ${formatMoney(rule.localNexus!.salesThreshold)} threshold used by the ${rule.localNexus!.body}.`
        : `${state} has no statewide sales tax.`,
      measuredSales: w.sales,
      measuredOrders: w.orders,
      salesPercentage: rule.localNexus ? w.exposure.salesPercentage : 0,
      transactionPercentage: 0,
      highestPercentage: rule.localNexus ? w.exposure.highestPercentage : 0,
      window: toSummary(w),
      overNow: false,
      startsNextYear: false,
      pastExposure: null,
      marketplaceOnly: false,
      localNexusOver: localOver,
      marketplace: { counted: includeMarketplace, sales: w.marketplaceSales, orders: w.marketplaceOrders },
      why,
      confidence: 'high',
      confidenceReasons: [],
      nextStep: localOver
        ? {
            kind: 'review',
            text: `Check whether you need to register with the ${rule.localNexus!.body} to collect local sales tax on orders to participating Alaska towns.`,
          }
        : { kind: 'none', text: `Nothing to do for ${state}.` },
    };
  }

  // ── Pick the window(s) this state's rule uses ──
  let overNow = false;
  let startsNextYear = false;
  let pastExposure: { period: string } | null = null;
  let deciding: WindowResult;
  let live: WindowResult;
  let nearMissLine: string | null = null;
  let marketplaceContext: WindowResult | null = null;

  if (rule.measurementPeriod === 'rolling_12_months') {
    live = trailing(current);
    const recent = monthRange(addMonths(current, -11), current).map(trailing);
    const recentOver = recent.filter((w) => w.exceeded);
    if (recentOver.length > 0) {
      overNow = true;
      deciding = live.exceeded ? live : highest(recentOver);
    } else {
      const pastEnds = monthRange(`${year - 2}-12`, addMonths(current, -12));
      const past = pastEnds.map(trailing).filter((w) => w.exceeded);
      if (past.length > 0) {
        deciding = past[0];
        pastExposure = { period: `from ${monthLabel(addMonths(deciding.endMonth, 1))}` };
      } else {
        deciding = live;
      }
    }
  } else {
    const prev = previousYear();
    const cur = currentYear();
    const before = yearBeforePrevious();
    live = cur;
    if (rule.measurementPeriod === 'previous_calendar_year') {
      if (prev.exceeded) {
        overNow = true;
        deciding = prev;
      } else if (cur.exceeded) {
        startsNextYear = true;
        deciding = cur;
      } else if (before.exceeded) {
        pastExposure = { period: `${year - 1}` };
        deciding = before;
      } else {
        deciding = cur;
      }
    } else {
      if (prev.exceeded || cur.exceeded) {
        overNow = true;
        deciding = cur.exceeded && (!prev.exceeded || cur.exposure.highestPercentage >= prev.exposure.highestPercentage) ? cur : prev;
      } else if (before.exceeded) {
        pastExposure = { period: `${year - 1}` };
        deciding = before;
      } else {
        deciding = cur;
      }
    }
    if (!overNow && !startsNextYear && !pastExposure && (prev.sales > 0 || prev.orders > 0)) {
      nearMissLine =
        prev.exposure.highestPercentage >= 75
          ? `In ${year - 1} you reached ${formatPercent(prev.exposure.highestPercentage)} of the threshold (${formatMoney(prev.sales)}).`
          : `In ${year - 1} your sales into ${state} were ${formatMoney(prev.sales)} (${formatPercent(prev.exposure.highestPercentage)} of the threshold).`;
    }
    if (!overNow && !startsNextYear && !pastExposure && cur.marketplaceSales === 0 && prev.marketplaceSales > 0) {
      marketplaceContext = prev;
    }
  }

  // Marketplace-only: over, but every counted sale went through marketplaces
  const marketplaceOnly =
    (overNow || startsNextYear || pastExposure !== null) && includeMarketplace && deciding.directSales <= 0 && deciding.marketplaceSales > 0;

  // ── Status ──
  let status: ExposureStatus;
  if (overNow && !marketplaceOnly) status = 'exceeded';
  else if (overNow || startsNextYear || pastExposure) status = 'warning';
  else status = live.exposure.status;

  const shown = overNow || startsNextYear || pastExposure ? deciding : live;
  const exp = shown.exposure;

  // ── Summary line (decides the wording of alerts too) ──
  const tx = rule.transactionThreshold;
  const decidedByOrders = base.logic === 'or' && !!tx && exp.transactionPercentage > exp.salesPercentage;
  let summaryLine: string;
  if (shown.sales <= 0 && shown.orders === 0) {
    summaryLine =
      shown.marketplaceSales > 0 && !includeMarketplace
        ? `Your ${state} sales ${shown.phrase} all went through marketplaces, which ${state} doesn't count toward your threshold.`
        : `No sales into ${state} ${shown.phrase}.`;
  } else if (base.logic === 'and' && tx) {
    summaryLine = `${state} needs both tests. ${capitalize(shown.phrase)}: ${formatMoney(shown.sales)} in sales (${formatPercent(exp.salesPercentage)} of ${formatMoney(rule.salesThreshold)}) and ${formatCount(shown.orders)} orders (${formatPercent(exp.transactionPercentage)} of ${formatCount(tx)}).`;
  } else if (decidedByOrders && tx) {
    summaryLine = `You had ${formatCount(shown.orders)} orders into ${state} ${shown.phrase} — ${formatPercent(exp.transactionPercentage)} of the ${formatCount(tx)}-order threshold. Sales were ${formatMoney(shown.sales)} (${formatPercent(exp.salesPercentage)} of ${formatMoney(rule.salesThreshold)}).`;
  } else {
    summaryLine = `Your sales into ${state} ${shown.phrase} were ${formatMoney(shown.sales)} — ${formatPercent(exp.salesPercentage)} of the ${formatMoney(rule.salesThreshold)} threshold.`;
  }

  // ── Why ──
  const why: string[] = [summaryLine];
  if (tx && base.logic === 'or' && !decidedByOrders && shown.orders > 0) {
    why.push(`Either ${formatMoney(rule.salesThreshold)} in sales or ${formatCount(tx)} orders is enough in ${state}. You had ${formatCount(shown.orders)} orders.`);
  }
  if (rule.measurementPeriod === 'previous_calendar_year') {
    why.push(`${state} decides based on the previous calendar year.`);
  } else if (rule.measurementPeriod === 'rolling_12_months') {
    why.push(
      `${state} looks at rolling 12-month periods, so Sails checks every 12-month period ending in the past year.${rule.measurementNote ? ` (${stripPeriod(rule.measurementNote)}; Sails uses calendar months as a close stand-in.)` : ''}`
    );
  } else {
    why.push(`${state} checks last calendar year and this one — crossing in either counts.`);
  }
  if (nearMissLine) why.push(nearMissLine);
  const mkt = shown.marketplaceSales > 0 ? shown : marketplaceContext;
  if (mkt) {
    why.push(
      includeMarketplace
        ? `${state} counts marketplace sales too, so ${mkt === shown ? 'this includes' : `your ${mkt.label} total includes`} ${formatMoney(mkt.marketplaceSales)} of marketplace (Amazon…) sales.`
        : `${state} doesn't count sales made through marketplaces like Amazon toward your threshold, so ${formatMoney(mkt.marketplaceSales)} of marketplace sales ${mkt.phrase} were left out.`
    );
  }
  if (startsNextYear) {
    why.push(`Because ${state} looks at the previous year, crossing in ${year} means registering by January 1, ${year + 1}.`);
  }
  if (pastExposure) {
    why.push(
      rule.measurementPeriod === 'rolling_12_months'
        ? `That crossing meant ${state} expected you to register and collect ${pastExposure.period}, even though you're under the threshold today.`
        : `That means ${state} expected you to register and collect during ${pastExposure.period}, even though you're under the threshold now.`
    );
  }

  // ── How sure ──
  let confidence: Confidence = 'high';
  const confidenceReasons: string[] = [];
  const noteReason = (reason: string, level: Confidence) => {
    confidenceReasons.push(reason);
    confidence = lower(confidence, level);
  };

  const confirmedOver = overNow || startsNextYear || pastExposure !== null;
  const neededStart =
    rule.measurementPeriod === 'rolling_12_months' ? monthStart(addMonths(current, -11)) : new Date(Date.UTC(year - 1, 0, 1));
  const relevant: { label: string; cov: ChannelCoverage }[] = [];
  if (coverage.direct.earliest || !coverage.hasMarketplaceData) relevant.push({ label: 'store', cov: coverage.direct });
  if (includeMarketplace && coverage.hasMarketplaceData) relevant.push({ label: 'marketplace (Amazon…)', cov: coverage.marketplace });

  if (!coverage.earliestOrder) {
    noteReason('There are no orders to measure yet.', 'low');
  } else if (!confirmedOver) {
    // Missing, stale or capped data can only make the real totals higher,
    // so it matters when the answer is "under".
    for (const { label, cov } of relevant) {
      if (!cov.earliest || !cov.latest) continue;
      if (cov.earliest.getTime() > neededStart.getTime()) {
        const span = now.getTime() - neededStart.getTime();
        const missingShare = span > 0 ? (cov.earliest.getTime() - neededStart.getTime()) / span : 1;
        noteReason(
          `Your ${label} orders ${fromFiles ? 'in these files' : 'in Sails'} start on ${formatDay(cov.earliest)}, but ${state} looks back to ${formatDay(neededStart)}. Earlier sales aren't counted, so your real total may be higher.`,
          missingShare > 0.5 ? 'low' : 'medium'
        );
      }
      const staleDays = (now.getTime() - cov.latest.getTime()) / DAY;
      if (staleDays > STALE_AFTER_DAYS) {
        noteReason(
          `Your most recent ${label} order ${fromFiles ? 'in these files' : 'in Sails'} is from ${formatDay(cov.latest)}. Sales since then aren't counted${
            fromFiles ? ' — add a newer export' : label === 'store' ? ' — sync your store to bring them in' : ' — upload a newer report'
          }.`,
          staleDays > 120 ? 'low' : 'medium'
        );
      }
    }
    const windowStartMonth = monthKey(neededStart);
    const capped = coverage.cappedMonths.filter((m) => m >= windowStartMonth && m <= current);
    if (capped.length > 0) {
      noteReason(
        `Your plan's limit of ${coverage.planOrderLimit?.toLocaleString('en-US') ?? 'your'} orders a month was reached in ${listNames(capped.map(monthLabel))}. Orders beyond the limit weren't imported, so your real total may be higher.`,
        capped.length >= 3 ? 'low' : 'medium'
      );
    }
    if (includeMarketplace && !coverage.hasMarketplaceData && status !== 'safe') {
      noteReason(
        `${state} also counts sales you make on marketplaces like Amazon, Etsy or eBay. If you sell there too, add those sales — they could put you over sooner.`,
        'medium'
      );
    }
  }
  if (status !== 'safe' && rule.countedSales !== 'gross') {
    noteReason(
      `${state} only counts ${rule.countedSales === 'taxable' ? 'taxable' : 'retail'} sales. Sails counted all of your sales, so if some were exempt or sold for resale, your real total is lower.`,
      'medium'
    );
  }
  if (exp.highestPercentage >= 90 && exp.highestPercentage < 110) {
    noteReason(`You're within 10% of the threshold, so refunds, discounts or how shipping is counted could tip the result either way.`, 'medium');
  }

  // ── Projection (calendar-year states, while under this year) ──
  let projectedCrossing: string | null = null;
  if (rule.measurementPeriod !== 'rolling_12_months' && !live.exceeded && !overNow) {
    const relevantEarliest = relevant
      .map((r) => r.cov.earliest)
      .filter((d): d is Date => !!d)
      .reduce<Date | null>((min, d) => (!min || d < min ? d : min), null);
    const paceStart = Math.max(Date.UTC(year, 0, 1), relevantEarliest?.getTime() ?? Date.UTC(year, 0, 1));
    const days = (now.getTime() - paceStart) / DAY;
    if (days >= 30) {
      const untilSales =
        live.sales > 0 && rule.salesThreshold > live.sales ? (rule.salesThreshold - live.sales) / (live.sales / days) : Infinity;
      const untilOrders =
        tx && live.orders > 0 && tx > live.orders ? (tx - live.orders) / (live.orders / days) : Infinity;
      const untilDays = base.logic === 'and' && tx ? Math.max(untilSales, untilOrders) : Math.min(untilSales, untilOrders);
      if (Number.isFinite(untilDays)) {
        const crossingAt = new Date(now.getTime() + untilDays * DAY);
        if (crossingAt.getUTCFullYear() === year) projectedCrossing = monthLabel(monthKey(crossingAt));
      }
    }
  }

  // ── What next ──
  const hasMarketplace = shown.marketplaceSales > 0;
  const onOrders = hasMarketplace ? 'on orders from your own store' : 'on orders';
  let nextStep: StateEvaluation['nextStep'];
  if (registration !== 'none' && (overNow || startsNextYear || pastExposure)) {
    nextStep = {
      kind: 'none',
      text:
        registration === 'registered'
          ? `You're registered in ${state}. Keep collecting tax ${onOrders} shipped there and filing on schedule.`
          : `You've marked ${state} as a nexus state in Sails. If you haven't registered yet, register before you collect tax there.`,
    };
  } else if (marketplaceOnly) {
    nextStep = {
      kind: 'review',
      text: `All of your counted ${state} sales went through marketplaces like Amazon, which already collect ${state}'s tax — don't collect it again on those orders. ${
        rule.marketplaceNote ?? `${state} counts those sales toward your threshold, so check whether it expects marketplace-only sellers to register.`
      } If you start selling through your own store, you'd need to register first.`,
    };
  } else if (overNow) {
    nextStep = {
      kind: 'register_now',
      text: `Register for a sales tax permit in ${state}, then collect tax ${onOrders} shipped there. Don't collect ${state} tax until you're registered.`,
    };
  } else if (startsNextYear) {
    nextStep = {
      kind: 'plan_registration',
      text: `Plan to register with ${state} before January 1, ${year + 1}, so you can start collecting tax ${onOrders} shipped there on that date.`,
    };
  } else if (pastExposure) {
    nextStep = {
      kind: 'past_exposure',
      text: `Talk to a tax professional about ${state}. You may owe tax you didn't collect ${pastExposure.period.startsWith('from') ? pastExposure.period : `for ${pastExposure.period}`}; many states offer voluntary disclosure programs that reduce penalties.`,
    };
  } else if (status === 'warning' || status === 'approaching') {
    nextStep = {
      kind: 'watch',
      text: projectedCrossing
        ? `Keep an eye on ${state}. At your current pace you'd reach the threshold around ${projectedCrossing}${rule.measurementPeriod === 'previous_calendar_year' ? `, which would mean registering by January 1, ${year + 1}` : ''}.`
        : `Keep an eye on ${state}. Once you cross the threshold, you'll need to register before collecting tax there.`,
    };
  } else if (shown.sales > 0 || shown.orders > 0) {
    nextStep = {
      kind: 'none',
      text: projectedCrossing
        ? `Nothing to do in ${state} yet. At your current pace you'd reach the threshold around ${projectedCrossing}.`
        : `Nothing to do in ${state} right now.`,
    };
  } else if (shown.marketplaceSales > 0 && !includeMarketplace) {
    nextStep = { kind: 'none', text: `Nothing to do in ${state} right now — it doesn't count your marketplace sales.` };
  } else if (hasAnySales) {
    nextStep = { kind: 'none', text: `Nothing to do in ${state} right now.` };
  } else {
    nextStep = { kind: 'none', text: `No sales into ${state} yet.` };
  }

  // ── Headline ──
  let headline: string;
  if (registration !== 'none' && (overNow || startsNextYear || pastExposure)) headline = registration === 'registered' ? 'Registered' : 'Marked as nexus state';
  else if (marketplaceOnly) headline = 'Over — all via marketplaces';
  else if (overNow) headline = 'Over the threshold';
  else if (startsNextYear) headline = `Over in ${year} — register by Jan 1`;
  else if (pastExposure) headline = `Was over ${pastExposure.period.startsWith('from') ? 'earlier' : `in ${year - 2}`} — check past tax`;
  else if (status === 'warning') headline = `Close — ${formatPercent(exp.highestPercentage)}`;
  else if (status === 'approaching') headline = `Getting close — ${formatPercent(exp.highestPercentage)}`;
  else if (shown.sales > 0 || shown.orders > 0) headline = `Under — ${formatPercent(exp.highestPercentage)}`;
  else if (shown.marketplaceSales > 0) headline = 'Under — marketplace sales not counted';
  else if (hasAnySales) headline = `No sales ${shown.phrase}`;
  else headline = 'No sales yet';

  return {
    ...base,
    status,
    headline,
    summaryLine,
    measuredSales: shown.sales,
    measuredOrders: shown.orders,
    salesPercentage: exp.salesPercentage,
    transactionPercentage: exp.transactionPercentage,
    highestPercentage: exp.highestPercentage,
    window: toSummary(shown),
    overNow,
    startsNextYear,
    pastExposure,
    marketplaceOnly,
    localNexusOver: false,
    marketplace: { counted: includeMarketplace, sales: shown.marketplaceSales, orders: shown.marketplaceOrders },
    projectedCrossing,
    why,
    confidence,
    confidenceReasons,
    nextStep,
  };
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** True when the seller should register in this state now. */
export function needsRegistration(e: StateEvaluation): boolean {
  return e.overNow && !e.marketplaceOnly && e.registration === 'none';
}

const STATUS_ORDER: Record<ExposureStatus, number> = { exceeded: 0, warning: 1, approaching: 2, safe: 3 };

function urgency(e: StateEvaluation): number {
  if (e.registration !== 'none' && (e.overNow || e.startsNextYear || e.pastExposure)) return 6;
  if (needsRegistration(e)) return 0;
  if (e.startsNextYear) return 1;
  if (e.pastExposure) return 2;
  if (e.marketplaceOnly || e.localNexusOver) return 3;
  return 3 + STATUS_ORDER[e.status];
}

/** Evaluate every state, most urgent first (no-sales-tax states last). */
export function evaluateAllStates(
  byState: Map<string, StateMonths>,
  ctx: EvaluationContext,
  rules: NexusThreshold[] = STATE_NEXUS_THRESHOLDS
): StateEvaluation[] {
  const results = rules.map((rule) => evaluateState(rule, byState.get(rule.stateCode), ctx));
  return results.sort((a, b) => {
    const aTaxed = a.hasSalesTax || a.localNexusOver;
    const bTaxed = b.hasSalesTax || b.localNexusOver;
    if (aTaxed !== bTaxed) return aTaxed ? -1 : 1;
    const diff = urgency(a) - urgency(b);
    if (diff !== 0) return diff;
    return b.highestPercentage - a.highestPercentage;
  });
}

export interface ExposureSummary {
  totalStatesWithSales: number;
  /** States where you should register now */
  registerNowCount: number;
  startsNextYearCount: number;
  pastExposureCount: number;
  /** Over only through marketplaces, or over a local (Alaska) threshold — check the rules */
  reviewCount: number;
  /** 75%+ of a threshold */
  closeCount: number;
  /** States you've marked as registered / nexus in Sails */
  trackedCount: number;
  safeCount: number;
  noSalesTaxCount: number;
}

export function summarize(evaluations: StateEvaluation[]): ExposureSummary {
  const unflagged = (e: StateEvaluation) => !e.overNow && !e.startsNextYear && !e.pastExposure && !e.localNexusOver;
  return {
    totalStatesWithSales: evaluations.filter((e) => e.hasAnySales).length,
    registerNowCount: evaluations.filter(needsRegistration).length,
    startsNextYearCount: evaluations.filter((e) => e.startsNextYear && e.registration === 'none' && !e.marketplaceOnly).length,
    pastExposureCount: evaluations.filter((e) => e.pastExposure && e.registration === 'none' && !e.marketplaceOnly).length,
    reviewCount: evaluations.filter((e) => (e.marketplaceOnly || e.localNexusOver) && e.registration === 'none').length,
    closeCount: evaluations.filter((e) => unflagged(e) && (e.status === 'warning' || e.status === 'approaching')).length,
    trackedCount: evaluations.filter((e) => e.registration !== 'none').length,
    safeCount: evaluations.filter((e) => e.hasSalesTax && e.status === 'safe').length,
    noSalesTaxCount: evaluations.filter((e) => !e.hasSalesTax).length,
  };
}

// ─── Top actions ─────────────────────────────────────────────────────────────

export type TopActionKind =
  | 'register'
  | 'review'
  | 'plan'
  | 'past'
  | 'upgrade'
  | 'sync'
  | 'import_history'
  | 'watch'
  | 'add_marketplace'
  | 'connect_store';

export interface TopAction {
  kind: TopActionKind;
  stateCode?: string;
  title: string;
  detail: string;
}

/**
 * The most useful things to do next, in order of urgency: register where
 * you're over → plan for next-year states → check past exposure → check
 * marketplace-only/local cases → fix missing data → watch close states.
 */
export function getTopActions(
  evaluations: StateEvaluation[],
  coverage: DataCoverage,
  now: Date,
  limit = 3,
  source: OrderSource = 'sails'
): TopAction[] {
  const actions: TopAction[] = [];
  const year = now.getUTCFullYear();
  const fromFiles = source === 'files';
  const where = fromFiles ? 'in these files' : 'in Sails';

  if (!coverage.earliestOrder) {
    return [
      {
        kind: 'connect_store',
        title: fromFiles ? 'Add your order files' : 'Bring in your orders',
        detail: fromFiles
          ? 'Drop in an order export so Sails can check every state for you.'
          : 'Connect your store (or upload an Amazon report) so Sails can check every state for you.',
      },
    ];
  }

  const open = evaluations.filter((e) => e.registration === 'none');

  for (const e of open.filter(needsRegistration)) {
    actions.push({ kind: 'register', stateCode: e.stateCode, title: `Register in ${e.stateName}`, detail: e.summaryLine });
  }
  for (const e of open.filter((x) => x.startsNextYear && !x.marketplaceOnly)) {
    actions.push({
      kind: 'plan',
      stateCode: e.stateCode,
      title: `Plan to register in ${e.stateName} by Jan 1, ${year + 1}`,
      detail: `You passed ${e.stateName}'s threshold in ${year}; it applies from next year.`,
    });
  }
  for (const e of open.filter((x) => x.pastExposure && !x.marketplaceOnly)) {
    actions.push({
      kind: 'past',
      stateCode: e.stateCode,
      title: `Check past tax for ${e.stateName}`,
      detail: e.summaryLine,
    });
  }

  for (const e of open.filter((x) => x.marketplaceOnly || x.localNexusOver)) {
    actions.push({
      kind: 'review',
      stateCode: e.stateCode,
      title: e.localNexusOver ? `Check Alaska's local (ARSSTC) rules` : `Check ${e.stateName}'s rules for marketplace sellers`,
      detail: e.summaryLine,
    });
  }
  const current = monthKey(now);
  const recentCaps = coverage.cappedMonths.filter((m) => m >= addMonths(current, -23));
  if (recentCaps.length > 0) {
    actions.push({
      kind: 'upgrade',
      title: 'Upgrade so every order counts',
      detail: `Your plan's monthly limit kept some orders out in ${recentCaps.length} month${recentCaps.length === 1 ? '' : 's'}, so some state totals are low.`,
    });
  }

  const stale = (c: ChannelCoverage) => !!c.latest && (now.getTime() - c.latest.getTime()) / DAY > STALE_AFTER_DAYS;
  if (stale(coverage.direct)) {
    actions.push({
      kind: 'sync',
      title: fromFiles ? 'Add a newer store export' : 'Sync your store',
      detail: `Your newest store order ${where} is from ${formatDay(coverage.direct.latest!)}.`,
    });
  } else if (coverage.hasMarketplaceData && stale(coverage.marketplace)) {
    actions.push({
      kind: 'sync',
      title: fromFiles ? 'Add a newer marketplace export' : 'Upload a newer Amazon report',
      detail: `Your newest ${fromFiles ? 'marketplace' : 'Amazon'} order ${where} is from ${formatDay(coverage.marketplace.latest!)}.`,
    });
  }

  const taxed = open.filter((e) => e.hasSalesTax);
  const historyMatters = taxed.some((e) => e.status !== 'safe' || e.highestPercentage >= 50);
  if (historyMatters && coverage.earliestOrder.getTime() > Date.UTC(year - 1, 0, 1)) {
    actions.push({
      kind: 'import_history',
      title: `Add orders back to January 1, ${year - 1}`,
      detail: fromFiles
        ? `Many states look at all of last year. Your files start on ${formatDay(coverage.earliestOrder)} — if you sold before then, add an older export.`
        : `Many states look at all of last year. Your history in Sails starts on ${formatDay(coverage.earliestOrder)} — if you sold before then, add those orders.`,
    });
  }

  for (const e of taxed.filter((x) => !x.overNow && !x.startsNextYear && !x.pastExposure && (x.status === 'warning' || x.status === 'approaching'))) {
    actions.push({
      kind: 'watch',
      stateCode: e.stateCode,
      title: `Watch ${e.stateName} (${formatPercent(e.highestPercentage)})`,
      detail: e.projectedCrossing
        ? `At your current pace you'd reach the threshold around ${e.projectedCrossing}.`
        : `You're at ${formatPercent(e.highestPercentage)} of the threshold.`,
    });
  }

  if (!coverage.hasMarketplaceData) {
    const marketplaceStatesClose = taxed.filter((e) => e.marketplace.counted && e.highestPercentage >= 50 && !e.overNow);
    if (marketplaceStatesClose.length > 0) {
      actions.push({
        kind: 'add_marketplace',
        title: 'Add your Amazon, Etsy or eBay sales',
        detail: `${listNames(marketplaceStatesClose.map((e) => e.stateName).slice(0, 3))} count marketplace sales toward your threshold.`,
      });
    }
  }

  return actions.slice(0, limit);
}

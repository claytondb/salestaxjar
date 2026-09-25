/**
 * Nexus engine — decides, for every state, whether a seller has likely
 * crossed the economic nexus threshold, and explains why, how sure we are,
 * and what to do next.
 *
 * Pure functions only (no database, no network), so the same code runs on the
 * server for connected stores and in the browser for the free CSV scan.
 *
 * What it gets right that a naive "sum every order" does not:
 *  - Measurement windows: previous calendar year only (FL, PA…), previous OR
 *    current calendar year (most states), or the last 12 months (CT, NY…).
 *  - Marketplace sales (Amazon, Etsy, eBay…) only count in states that count
 *    them toward the seller's own threshold.
 *  - Sales tax the seller collected is never counted as "sales".
 *  - AND-logic states (CT, NY) need both the dollar and the order test.
 *  - It says how sure it is: missing order history, "taxable/retail sales
 *    only" states and results close to the line all lower confidence.
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

export interface StateWindows {
  previousYear: ChannelTotals;
  currentYear: ChannelTotals;
  rolling12: ChannelTotals;
}

export interface DataCoverage {
  /** Earliest order date in the data (any state), or null when there's none. */
  earliestOrder: Date | null;
  latestOrder: Date | null;
  /** True when any marketplace (Amazon…) orders are in the data. */
  hasMarketplaceData: boolean;
}

export type WindowKey = 'previousYear' | 'currentYear' | 'rolling12';

export interface WindowRange {
  start: Date;
  /** Exclusive end */
  end: Date;
}

export function emptyTotals(): Totals {
  return { sales: 0, orders: 0 };
}

export function emptyChannels(): ChannelTotals {
  return { direct: emptyTotals(), marketplace: emptyTotals() };
}

export function emptyWindows(): StateWindows {
  return { previousYear: emptyChannels(), currentYear: emptyChannels(), rolling12: emptyChannels() };
}

/**
 * The three windows states measure over, in UTC:
 *  previousYear — all of last calendar year
 *  currentYear  — January 1 this year up to now
 *  rolling12    — the 12 months up to now
 */
export function computeWindows(now: Date): Record<WindowKey, WindowRange> {
  const year = now.getUTCFullYear();
  const end = new Date(now.getTime() + 1); // include orders stamped exactly "now"
  const rollingStart = new Date(now.getTime());
  rollingStart.setUTCFullYear(rollingStart.getUTCFullYear() - 1);
  return {
    previousYear: { start: new Date(Date.UTC(year - 1, 0, 1)), end: new Date(Date.UTC(year, 0, 1)) },
    currentYear: { start: new Date(Date.UTC(year, 0, 1)), end },
    rolling12: { start: rollingStart, end },
  };
}

function inRange(date: Date, range: WindowRange): boolean {
  const t = date.getTime();
  return t >= range.start.getTime() && t < range.end.getTime();
}

/** Group orders into per-state window totals (used by the browser CSV scan). */
export function bucketOrders(
  orders: NexusOrder[],
  now: Date
): { byState: Map<string, StateWindows>; coverage: DataCoverage } {
  const windows = computeWindows(now);
  const byState = new Map<string, StateWindows>();
  let earliest: number | null = null;
  let latest: number | null = null;
  let hasMarketplaceData = false;

  for (const order of orders) {
    const t = order.date.getTime();
    if (Number.isNaN(t)) continue;
    earliest = earliest === null ? t : Math.min(earliest, t);
    latest = latest === null ? t : Math.max(latest, t);
    if (order.channel === 'marketplace') hasMarketplaceData = true;

    const code = order.stateCode.toUpperCase();
    let state = byState.get(code);
    if (!state) {
      state = emptyWindows();
      byState.set(code, state);
    }
    for (const key of ['previousYear', 'currentYear', 'rolling12'] as WindowKey[]) {
      if (inRange(order.date, windows[key])) {
        const bucket = state[key][order.channel];
        bucket.sales += order.sales;
        bucket.orders += 1;
      }
    }
  }

  return {
    byState,
    coverage: {
      earliestOrder: earliest === null ? null : new Date(earliest),
      latestOrder: latest === null ? null : new Date(latest),
      hasMarketplaceData,
    },
  };
}

// ─── Outputs ─────────────────────────────────────────────────────────────────

export type Confidence = 'high' | 'medium' | 'low';

export type NextStepKind = 'register_now' | 'plan_registration' | 'watch' | 'none';

export interface StateEvaluation {
  stateCode: string;
  stateName: string;
  hasSalesTax: boolean;
  /** safe / approaching (75%+) / warning (90%+) / exceeded — drives alerts */
  status: ExposureStatus;
  /** Short plain-language result, e.g. "Over the threshold" */
  headline: string;
  /** The amount and order count compared to the threshold */
  measuredSales: number;
  measuredOrders: number;
  salesThreshold: number | null;
  transactionThreshold: number | null;
  logic: 'and' | 'or';
  salesPercentage: number;
  transactionPercentage: number;
  highestPercentage: number;
  /** Which window decided the result */
  window: { key: WindowKey; label: string; start: string; end: string };
  /** True when this state measures the previous year and you crossed this year */
  startsNextYear: boolean;
  marketplace: {
    /** Does this state count marketplace sales toward your threshold? */
    counted: boolean;
    /** Marketplace sales in the deciding window (counted or not) */
    sales: number;
    orders: number;
  };
  /** Projected month the threshold is reached at the current pace (calendar-year states) */
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
    notes: string;
  };
  sources: { name: string; url: string; updated: string }[];
  rulesReviewed: string;
  /** Any sales into this state in any window (marketplace included) */
  hasAnySales: boolean;
  /** Totals for every window (as counted for this state), for detail views */
  totals: {
    previousYear: Totals;
    currentYear: Totals;
    rolling12: Totals;
  };
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

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function formatDay(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function windowPhrase(key: WindowKey, now: Date): string {
  const year = now.getUTCFullYear();
  if (key === 'previousYear') return `in ${year - 1}`;
  if (key === 'currentYear') return `in ${year} so far`;
  return 'in the last 12 months';
}

function windowLabel(key: WindowKey, now: Date): string {
  const year = now.getUTCFullYear();
  if (key === 'previousYear') return `${year - 1}`;
  if (key === 'currentYear') return `${year} so far`;
  return 'Last 12 months';
}

function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
}

// ─── Evaluation ──────────────────────────────────────────────────────────────

function countedTotals(channels: ChannelTotals, includeMarketplace: boolean): Totals {
  return {
    sales: channels.direct.sales + (includeMarketplace ? channels.marketplace.sales : 0),
    orders: channels.direct.orders + (includeMarketplace ? channels.marketplace.orders : 0),
  };
}

const CONFIDENCE_RANK: Record<Confidence, number> = { high: 2, medium: 1, low: 0 };

function lower(a: Confidence, b: Confidence): Confidence {
  return CONFIDENCE_RANK[a] <= CONFIDENCE_RANK[b] ? a : b;
}

/**
 * Evaluate one state.
 *
 * @param rule     the state's nexus rule
 * @param windows  the seller's sales into that state (undefined = none)
 * @param ctx      "now" and how much order history the data covers
 */
export function evaluateState(
  rule: NexusThreshold,
  windows: StateWindows | undefined,
  ctx: { now: Date; coverage: DataCoverage }
): StateEvaluation {
  const { now, coverage } = ctx;
  const w = windows ?? emptyWindows();
  const ranges = computeWindows(now);
  const includeMarketplace = rule.marketplaceSales === 'included';
  const year = now.getUTCFullYear();
  const state = rule.stateName;

  const counted: Record<WindowKey, Totals> = {
    previousYear: countedTotals(w.previousYear, includeMarketplace),
    currentYear: countedTotals(w.currentYear, includeMarketplace),
    rolling12: countedTotals(w.rolling12, includeMarketplace),
  };

  const base = {
    stateCode: rule.stateCode,
    stateName: rule.stateName,
    hasSalesTax: rule.hasSalesTax,
    salesThreshold: rule.salesThreshold,
    transactionThreshold: rule.transactionThreshold,
    logic: (rule.logic ?? 'or') as 'and' | 'or',
    rule: {
      measurementPeriod: rule.measurementPeriod,
      measurementLabel: MEASUREMENT_PERIOD_LABELS[rule.measurementPeriod],
      measurementNote: rule.measurementNote,
      countedSales: rule.countedSales,
      countedSalesLabel: COUNTED_SALES_LABELS[rule.countedSales],
      marketplaceSales: rule.marketplaceSales,
      marketplaceNote: rule.marketplaceNote,
      notes: rule.notes,
    },
    sources: NEXUS_RULES_SOURCES.map((s) => ({ name: s.name, url: s.url, updated: s.updated })),
    rulesReviewed: NEXUS_RULES_REVIEWED_LABEL,
    totals: counted,
    hasAnySales: (['previousYear', 'currentYear', 'rolling12'] as WindowKey[]).some(
      (k) => w[k].direct.orders + w[k].marketplace.orders > 0 || w[k].direct.sales + w[k].marketplace.sales > 0
    ),
  };

  // No statewide sales tax (or no threshold to measure against)
  if (!rule.hasSalesTax || !rule.salesThreshold) {
    const key: WindowKey = 'rolling12';
    return {
      ...base,
      status: 'safe',
      headline: 'No state sales tax',
      measuredSales: counted[key].sales,
      measuredOrders: counted[key].orders,
      salesPercentage: 0,
      transactionPercentage: 0,
      highestPercentage: 0,
      window: { key, label: windowLabel(key, now), start: ranges[key].start.toISOString(), end: now.toISOString() },
      startsNextYear: false,
      marketplace: { counted: includeMarketplace, sales: w[key].marketplace.sales, orders: w[key].marketplace.orders },
      projectedCrossing: null,
      why: [`${state} has no statewide sales tax.${rule.notes ? ` ${rule.notes}` : ''}`],
      confidence: 'high',
      confidenceReasons: [],
      nextStep: { kind: 'none', text: `Nothing to do for ${state}.` },
    };
  }

  const evalWindow = (key: WindowKey) => calculateExposureStatus(counted[key].sales, counted[key].orders, rule);

  // Pick the deciding window for this state's measurement rule
  let key: WindowKey;
  let status: ExposureStatus;
  let startsNextYear = false;

  if (rule.measurementPeriod === 'rolling_12_months') {
    key = 'rolling12';
    status = evalWindow(key).status;
  } else if (rule.measurementPeriod === 'previous_calendar_year') {
    const prev = evalWindow('previousYear');
    const cur = evalWindow('currentYear');
    if (prev.status === 'exceeded') {
      key = 'previousYear';
      status = 'exceeded';
    } else if (cur.status === 'exceeded') {
      // Crossed this year: the obligation starts next January.
      key = 'currentYear';
      status = 'warning';
      startsNextYear = true;
    } else {
      key = cur.highestPercentage > prev.highestPercentage ? 'currentYear' : 'previousYear';
      status = key === 'currentYear' ? cur.status : prev.status;
    }
  } else {
    // previous_or_current_calendar_year (and the legacy 'calendar_year')
    const prev = evalWindow('previousYear');
    const cur = evalWindow('currentYear');
    key = cur.highestPercentage >= prev.highestPercentage ? 'currentYear' : 'previousYear';
    status = (key === 'currentYear' ? cur : prev).status;
  }

  const decided = evalWindow(key);
  const measured = counted[key];
  const phrase = windowPhrase(key, now);
  const marketplaceInWindow = w[key].marketplace;

  // ── Why ──
  const why: string[] = [];
  const noCountedSales = measured.sales === 0 && measured.orders === 0;
  why.push(
    noCountedSales
      ? `No counted sales into ${state} ${phrase}. The threshold is ${formatMoney(rule.salesThreshold)}${rule.transactionThreshold ? ` ${base.logic === 'and' ? 'and' : 'or'} ${rule.transactionThreshold.toLocaleString('en-US')} orders` : ''}.`
      : `Your sales into ${state} ${phrase} were ${formatMoney(measured.sales)} — ${formatPercent(decided.salesPercentage)} of the ${formatMoney(rule.salesThreshold)} threshold.`
  );
  if (rule.transactionThreshold && !noCountedSales) {
    const orderLine = `You had ${plural(measured.orders, 'order', 'orders')} there (${formatPercent(decided.transactionPercentage)} of ${rule.transactionThreshold.toLocaleString('en-US')}).`;
    const logicLine =
      base.logic === 'and'
        ? `${state} requires both: ${formatMoney(rule.salesThreshold)} in sales and ${rule.transactionThreshold.toLocaleString('en-US')} orders.`
        : `Either ${formatMoney(rule.salesThreshold)} in sales or ${rule.transactionThreshold.toLocaleString('en-US')} orders is enough in ${state}.`;
    why.push(`${orderLine} ${logicLine}`);
  }
  if (rule.measurementPeriod === 'previous_calendar_year') {
    why.push(`${state} only looks at the previous calendar year to decide whether you must register.`);
  } else if (rule.measurementPeriod === 'rolling_12_months') {
    why.push(
      `${state} looks at the last 12 months.${rule.measurementNote ? ` (${rule.measurementNote}. Sails uses the last 12 months as a close stand-in.)` : ''}`
    );
  } else {
    why.push(`${state} checks last calendar year and this one — whichever is higher. That's ${windowLabel(key, now)} for you.`);
  }
  if (marketplaceInWindow.sales > 0) {
    why.push(
      includeMarketplace
        ? `${state} counts marketplace sales too, so this includes ${formatMoney(marketplaceInWindow.sales)} of marketplace (Amazon) sales.`
        : `${state} doesn't count sales made through marketplaces like Amazon toward your threshold, so ${formatMoney(marketplaceInWindow.sales)} of marketplace sales ${phrase} were left out.`
    );
  }
  if (startsNextYear) {
    why.push(
      `Because ${state} looks at the previous year, crossing the threshold in ${year} means you'll likely need to register by January 1, ${year + 1}.`
    );
  }

  // ── How sure ──
  let confidence: Confidence = 'high';
  const confidenceReasons: string[] = [];
  const noteReason = (reason: string, level: Confidence) => {
    confidenceReasons.push(reason);
    confidence = lower(confidence, level);
  };

  const overNow = status === 'exceeded';
  const neededWindowStart =
    rule.measurementPeriod === 'rolling_12_months' ? ranges.rolling12.start : ranges.previousYear.start;
  if (!coverage.earliestOrder) {
    noteReason('There are no orders to measure yet.', 'low');
  } else if (!overNow && coverage.earliestOrder.getTime() > neededWindowStart.getTime()) {
    // Missing history can only make the real total higher, so it matters when we say "under".
    const span = now.getTime() - neededWindowStart.getTime();
    const missing = coverage.earliestOrder.getTime() - neededWindowStart.getTime();
    const missingShare = span > 0 ? missing / span : 1;
    noteReason(
      `Your order history starts on ${formatDay(coverage.earliestOrder)}, but ${state} can look back to ${formatDay(neededWindowStart)}. Sales before your history starts aren't counted, so your real total may be higher.`,
      missingShare > 0.5 ? 'low' : 'medium'
    );
  }

  if (status !== 'safe' && rule.countedSales !== 'gross') {
    noteReason(
      `${state} only counts ${rule.countedSales === 'taxable' ? 'taxable' : 'retail'} sales. Sails counted all of your sales, so if some were exempt or sold for resale, your real total is lower.`,
      'medium'
    );
  }

  if (decided.highestPercentage >= 90 && decided.highestPercentage < 110) {
    noteReason(
      `You're within 10% of the threshold, so refunds, discounts or how shipping is counted could tip the result either way.`,
      'medium'
    );
  }

  if (includeMarketplace && !coverage.hasMarketplaceData && coverage.earliestOrder && status !== 'safe' && !overNow) {
    noteReason(
      `${state} also counts sales you make on marketplaces like Amazon, Etsy or eBay. If you sell there too, add those sales — they could put you over sooner.`,
      'medium'
    );
  }

  // ── Projection (calendar-year states only) ──
  let projectedCrossing: string | null = null;
  const yearStart = ranges.currentYear.start.getTime();
  const daysElapsed = (now.getTime() - yearStart) / 86_400_000;
  const measuresCalendarYears = rule.measurementPeriod !== 'rolling_12_months';
  if (measuresCalendarYears && status !== 'exceeded' && !startsNextYear && daysElapsed >= 30) {
    const curSales = counted.currentYear.sales;
    const perDay = curSales / daysElapsed;
    const remaining = rule.salesThreshold - curSales;
    if (perDay > 0 && remaining > 0) {
      const crossingAt = new Date(now.getTime() + (remaining / perDay) * 86_400_000);
      if (crossingAt.getUTCFullYear() === year) {
        projectedCrossing = formatMonthYear(crossingAt);
      }
    }
  }

  // ── What next ──
  let nextStep: StateEvaluation['nextStep'];
  if (status === 'exceeded') {
    nextStep = {
      kind: 'register_now',
      text: `Register for a sales tax permit in ${state}, then collect tax on new orders shipped there. Don't collect ${state} tax until you're registered.`,
    };
  } else if (startsNextYear) {
    nextStep = {
      kind: 'plan_registration',
      text: `Plan to register with ${state} before January 1, ${year + 1}, so you can collect tax from that date.`,
    };
  } else if (status === 'warning' || status === 'approaching') {
    nextStep = {
      kind: 'watch',
      text: projectedCrossing
        ? `Keep an eye on ${state}. At your current pace you'd reach the threshold around ${projectedCrossing}${rule.measurementPeriod === 'previous_calendar_year' ? `, which would mean registering by January 1, ${year + 1}` : ''}.`
        : `Keep an eye on ${state}. Once you cross the threshold, you'll need to register before collecting tax there.`,
    };
  } else if (measured.sales > 0 || measured.orders > 0) {
    nextStep = {
      kind: 'none',
      text: projectedCrossing
        ? `Nothing to do in ${state} yet. At your current pace you'd reach the threshold around ${projectedCrossing}.`
        : `Nothing to do in ${state} right now.`,
    };
  } else {
    nextStep = { kind: 'none', text: `No sales into ${state} yet.` };
  }

  // ── Headline ──
  let headline: string;
  if (status === 'exceeded') headline = 'Over the threshold';
  else if (startsNextYear) headline = `Over in ${year} — register by Jan 1`;
  else if (status === 'warning') headline = `Close — ${formatPercent(decided.highestPercentage)}`;
  else if (status === 'approaching') headline = `Getting close — ${formatPercent(decided.highestPercentage)}`;
  else if (measured.sales > 0 || measured.orders > 0) headline = `Under — ${formatPercent(decided.highestPercentage)}`;
  else headline = 'No sales yet';

  return {
    ...base,
    status,
    headline,
    measuredSales: measured.sales,
    measuredOrders: measured.orders,
    salesPercentage: decided.salesPercentage,
    transactionPercentage: decided.transactionPercentage,
    highestPercentage: decided.highestPercentage,
    window: {
      key,
      label: windowLabel(key, now),
      start: ranges[key].start.toISOString(),
      end: key === 'previousYear' ? ranges.previousYear.end.toISOString() : now.toISOString(),
    },
    startsNextYear,
    marketplace: { counted: includeMarketplace, sales: marketplaceInWindow.sales, orders: marketplaceInWindow.orders },
    projectedCrossing,
    why,
    confidence,
    confidenceReasons,
    nextStep,
  };
}

const STATUS_ORDER: Record<ExposureStatus, number> = { exceeded: 0, warning: 1, approaching: 2, safe: 3 };

/** Evaluate every state, most urgent first (no-sales-tax states last). */
export function evaluateAllStates(
  byState: Map<string, StateWindows>,
  ctx: { now: Date; coverage: DataCoverage },
  rules: NexusThreshold[] = STATE_NEXUS_THRESHOLDS
): StateEvaluation[] {
  const results = rules.map((rule) => evaluateState(rule, byState.get(rule.stateCode), ctx));
  return results.sort((a, b) => {
    if (a.hasSalesTax !== b.hasSalesTax) return a.hasSalesTax ? -1 : 1;
    if (a.startsNextYear !== b.startsNextYear && a.status === b.status) return a.startsNextYear ? -1 : 1;
    const diff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (diff !== 0) return diff;
    return b.highestPercentage - a.highestPercentage;
  });
}

export interface ExposureSummary {
  totalStatesWithSales: number;
  exceededCount: number;
  startsNextYearCount: number;
  warningCount: number;
  approachingCount: number;
  safeCount: number;
  noSalesTaxCount: number;
}

export function summarize(evaluations: StateEvaluation[]): ExposureSummary {
  return {
    totalStatesWithSales: evaluations.filter((e) => e.hasAnySales).length,
    exceededCount: evaluations.filter((e) => e.status === 'exceeded').length,
    startsNextYearCount: evaluations.filter((e) => e.startsNextYear).length,
    warningCount: evaluations.filter((e) => e.status === 'warning' && !e.startsNextYear).length,
    approachingCount: evaluations.filter((e) => e.status === 'approaching').length,
    safeCount: evaluations.filter((e) => e.status === 'safe' && e.hasSalesTax).length,
    noSalesTaxCount: evaluations.filter((e) => !e.hasSalesTax).length,
  };
}

// ─── Top actions ─────────────────────────────────────────────────────────────

export type TopActionKind = 'register' | 'plan' | 'import_history' | 'watch' | 'add_marketplace' | 'connect_store';

export interface TopAction {
  kind: TopActionKind;
  stateCode?: string;
  title: string;
  detail: string;
}

/**
 * The three most useful things to do next, in order of urgency:
 * register where you're over → plan for next-year states → fill gaps in the
 * data → watch states that are close → add marketplace sales.
 */
export function getTopActions(
  evaluations: StateEvaluation[],
  coverage: DataCoverage,
  now: Date,
  limit = 3
): TopAction[] {
  const actions: TopAction[] = [];
  const year = now.getUTCFullYear();

  if (!coverage.earliestOrder) {
    return [
      {
        kind: 'connect_store',
        title: 'Bring in your orders',
        detail: 'Connect your store (or upload an order file) so Sails can check every state for you.',
      },
    ];
  }

  const taxed = evaluations.filter((e) => e.hasSalesTax);

  for (const e of taxed.filter((x) => x.status === 'exceeded')) {
    actions.push({
      kind: 'register',
      stateCode: e.stateCode,
      title: `Register in ${e.stateName}`,
      detail: `Your sales ${windowPhrase(e.window.key, now)} were ${formatMoney(e.measuredSales)}, over the ${formatMoney(e.salesThreshold ?? 0)} threshold.`,
    });
  }

  for (const e of taxed.filter((x) => x.startsNextYear)) {
    actions.push({
      kind: 'plan',
      stateCode: e.stateCode,
      title: `Plan to register in ${e.stateName} by Jan 1, ${year + 1}`,
      detail: `You passed ${e.stateName}'s threshold in ${year}; it applies from next year.`,
    });
  }

  const prevYearStart = Date.UTC(year - 1, 0, 1);
  if (coverage.earliestOrder.getTime() > prevYearStart) {
    actions.push({
      kind: 'import_history',
      title: `Import orders back to January 1, ${year - 1}`,
      detail: `Many states look at all of last year. Your history starts on ${formatDay(coverage.earliestOrder)}, so some totals may be low.`,
    });
  }

  for (const e of taxed.filter((x) => !x.startsNextYear && (x.status === 'warning' || x.status === 'approaching'))) {
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
    const marketplaceStatesClose = taxed.filter((e) => e.marketplace.counted && e.highestPercentage >= 50 && e.status !== 'exceeded');
    if (marketplaceStatesClose.length > 0) {
      actions.push({
        kind: 'add_marketplace',
        title: 'Add your Amazon, Etsy or eBay sales',
        detail: `${marketplaceStatesClose.map((e) => e.stateName).slice(0, 3).join(', ')} count marketplace sales toward your threshold.`,
      });
    }
  }

  return actions.slice(0, limit);
}

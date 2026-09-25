/**
 * Made-up orders for the free check's "Try it with sample data" button. The
 * shape is chosen so every kind of result shows up at any time of year:
 * a state that's over by sales (WA), one that's over by order count (GA),
 * an older crossing to look into (CO), a state where only marketplace sales
 * went over (WI), one that's getting close (IL), and several that are fine.
 */

import type { NexusOrder, SalesChannel } from './nexus-engine';

interface Segment {
  state: string;
  channel: SalesChannel;
  /** Months back from now where the segment starts (older) and ends (newer); 0 = this month */
  fromMonthsBack: number;
  toMonthsBack: number;
  /** Sales per month and average order size */
  monthlySales: number;
  averageOrder: number;
}

/**
 * Calendar-year segments: year `yearOffset` (0 = this year, -1 = last year,
 * -2 = the year before). `sales` is for the full year; this year's share is
 * prorated to today.
 */
interface YearSegment {
  state: string;
  channel: SalesChannel;
  yearOffset: 0 | -1 | -2;
  sales: number;
  averageOrder: number;
}

const MONTH_MS = 30.4 * 86_400_000;

const ROLLING: Segment[] = [
  // Washington: steady store sales plus some Amazon — over $100,000 a year
  { state: 'WA', channel: 'direct', fromMonthsBack: 32, toMonthsBack: 0, monthlySales: 9_500, averageOrder: 95 },
  { state: 'WA', channel: 'marketplace', fromMonthsBack: 32, toMonthsBack: 0, monthlySales: 1_500, averageOrder: 45 },
  // Illinois: about $85,000 over any 12 months — getting close
  { state: 'IL', channel: 'direct', fromMonthsBack: 32, toMonthsBack: 0, monthlySales: 7_100, averageOrder: 120 },
  // Texas: well under its $500,000 threshold
  { state: 'TX', channel: 'direct', fromMonthsBack: 32, toMonthsBack: 0, monthlySales: 21_000, averageOrder: 110 },
  // California: under $500,000
  { state: 'CA', channel: 'direct', fromMonthsBack: 32, toMonthsBack: 0, monthlySales: 24_000, averageOrder: 130 },
  // Florida: store sales under $100,000; Amazon sales don't count there
  { state: 'FL', channel: 'direct', fromMonthsBack: 32, toMonthsBack: 0, monthlySales: 5_800, averageOrder: 85 },
  { state: 'FL', channel: 'marketplace', fromMonthsBack: 32, toMonthsBack: 0, monthlySales: 4_500, averageOrder: 40 },
  // Wisconsin: only Amazon sales, over $100,000 a year
  { state: 'WI', channel: 'marketplace', fromMonthsBack: 32, toMonthsBack: 0, monthlySales: 9_800, averageOrder: 42 },
  // A few small states
  { state: 'NY', channel: 'direct', fromMonthsBack: 32, toMonthsBack: 0, monthlySales: 6_000, averageOrder: 115 },
  { state: 'NJ', channel: 'direct', fromMonthsBack: 32, toMonthsBack: 0, monthlySales: 900, averageOrder: 100 },
  { state: 'OH', channel: 'direct', fromMonthsBack: 32, toMonthsBack: 0, monthlySales: 800, averageOrder: 85 },
  { state: 'OR', channel: 'direct', fromMonthsBack: 32, toMonthsBack: 0, monthlySales: 1_600, averageOrder: 100 },
];

const CALENDAR: YearSegment[] = [
  // Georgia: small orders, but more than 200 of them last year
  { state: 'GA', channel: 'direct', yearOffset: -2, sales: 16_000, averageOrder: 70 },
  { state: 'GA', channel: 'direct', yearOffset: -1, sales: 17_500, averageOrder: 70 },
  { state: 'GA', channel: 'direct', yearOffset: 0, sales: 16_500, averageOrder: 70 },
  // Colorado: a big year two years ago, quieter since — an older crossing to check
  { state: 'CO', channel: 'direct', yearOffset: -2, sales: 128_000, averageOrder: 160 },
  { state: 'CO', channel: 'direct', yearOffset: -1, sales: 38_000, averageOrder: 160 },
  { state: 'CO', channel: 'direct', yearOffset: 0, sales: 36_000, averageOrder: 160 },
];

/** Deterministic pseudo-random numbers so the sample looks the same every time. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function spreadOrders(
  out: NexusOrder[],
  rand: () => number,
  state: string,
  channel: SalesChannel,
  start: number,
  end: number,
  totalSales: number,
  averageOrder: number
) {
  if (end <= start || totalSales <= 0) return;
  const count = Math.max(1, Math.round(totalSales / averageOrder));
  const perOrder = totalSales / count;
  for (let i = 0; i < count; i++) {
    out.push({
      date: new Date(start + rand() * (end - start)),
      stateCode: state,
      // ±40% around the average, same total on average
      sales: Math.round(perOrder * (0.6 + 0.8 * rand()) * 100) / 100,
      channel,
    });
  }
}

export function sampleOrders(now: Date): NexusOrder[] {
  const rand = seeded(7);
  const orders: NexusOrder[] = [];
  const nowMs = now.getTime();
  const year = now.getUTCFullYear();
  const earliest = Date.UTC(year - 2, 0, 1);

  for (const seg of ROLLING) {
    const start = Math.max(earliest, nowMs - seg.fromMonthsBack * MONTH_MS);
    const end = nowMs - seg.toMonthsBack * MONTH_MS;
    const months = (end - start) / MONTH_MS;
    spreadOrders(orders, rand, seg.state, seg.channel, start, end, seg.monthlySales * months, seg.averageOrder);
  }

  for (const seg of CALENDAR) {
    const y = year + seg.yearOffset;
    const start = Date.UTC(y, 0, 1);
    const yearEnd = Date.UTC(y + 1, 0, 1) - 1;
    const end = seg.yearOffset === 0 ? nowMs : yearEnd;
    const share = (end - start) / (yearEnd - start);
    spreadOrders(orders, rand, seg.state, seg.channel, start, end, seg.sales * share, seg.averageOrder);
  }

  return orders.sort((a, b) => a.date.getTime() - b.date.getTime());
}

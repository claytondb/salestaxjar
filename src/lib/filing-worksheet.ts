/**
 * Filing worksheet: the numbers a seller needs to fill in a state's sales tax
 * return for one period, from the orders in Sails.
 *
 * Pure: the route loads grouped order totals and passes them in, so the
 * arithmetic and the wording are tested without a database.
 */

import { channelForPlatform, type SalesChannel } from './nexus-engine';
import { describeFilingPeriod } from './filing-deadlines';
import { toStateCode } from './us-states';

const DAY = 86_400_000;

export interface WorksheetRow {
  /** Ship-to state as stored (code or name) */
  state: string | null;
  platform: string;
  orders: number;
  /** Order totals minus sales tax (shipping included) */
  sales: number;
  shipping: number;
  tax: number;
}

export interface ChannelTotals {
  orders: number;
  sales: number;
  shipping: number;
  tax: number;
}

export interface FilingWorksheet {
  stateCode: string;
  stateName: string;
  period: string;
  periodLabel: string;
  /** First and last day of the period (YYYY-MM-DD) */
  periodStart: string;
  periodEnd: string;
  /** Orders from the seller's own store(s) */
  direct: ChannelTotals;
  /** Orders through marketplaces (Amazon, Etsy, eBay…), which collect and pay the tax */
  marketplace: ChannelTotals;
  /** Things to check before relying on the numbers */
  warnings: string[];
}

export interface FilingForWorksheet {
  stateCode: string;
  stateName: string;
  period: string;
  periodStart: Date;
  periodEnd: Date;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function emptyTotals(): ChannelTotals {
  return { orders: 0, sales: 0, shipping: 0, tax: 0 };
}

function day(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDay(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** The period covers whole days: [start, the day after periodEnd). */
export function worksheetRange(filing: Pick<FilingForWorksheet, 'periodStart' | 'periodEnd'>): { start: Date; endExclusive: Date } {
  const start = new Date(Date.UTC(filing.periodStart.getUTCFullYear(), filing.periodStart.getUTCMonth(), filing.periodStart.getUTCDate()));
  const end = new Date(Date.UTC(filing.periodEnd.getUTCFullYear(), filing.periodEnd.getUTCMonth(), filing.periodEnd.getUTCDate()));
  return { start, endExclusive: new Date(end.getTime() + DAY) };
}

/**
 * Build the worksheet from order totals grouped by ship-to state and
 * platform, plus the newest order Sails has from each channel.
 */
export function buildFilingWorksheet(
  filing: FilingForWorksheet,
  rows: WorksheetRow[],
  latestOrder: Partial<Record<SalesChannel, Date | null>>,
  now: Date = new Date()
): FilingWorksheet {
  const totals: Record<SalesChannel, ChannelTotals> = { direct: emptyTotals(), marketplace: emptyTotals() };
  for (const row of rows) {
    if (toStateCode(row.state) !== filing.stateCode) continue;
    const t = totals[channelForPlatform(row.platform)];
    t.orders += Number(row.orders) || 0;
    t.sales += Number(row.sales) || 0;
    t.shipping += Number(row.shipping) || 0;
    t.tax += Number(row.tax) || 0;
  }
  for (const t of Object.values(totals)) {
    t.sales = round2(t.sales);
    t.shipping = round2(t.shipping);
    t.tax = round2(t.tax);
  }

  const { endExclusive } = worksheetRange(filing);
  const warnings: string[] = [];
  if (now.getTime() < endExclusive.getTime()) {
    warnings.push(`This period isn't over yet (it ends ${formatDay(filing.periodEnd)}), so these numbers will still grow.`);
  } else {
    const latestDirect = latestOrder.direct ?? null;
    if (!latestDirect) {
      warnings.push('Sails has no orders from your own store yet. Connect your store or import an order export first.');
    } else if (latestDirect.getTime() < endExclusive.getTime() - DAY) {
      warnings.push(
        `Your newest store order in Sails is from ${formatDay(latestDirect)}. If you sold after that, sync your store or import the rest of the period before you file.`
      );
    }
  }
  if (totals.direct.orders > 0 && totals.direct.tax === 0) {
    warnings.push(
      `None of these ${filing.stateName} orders show sales tax. If you were registered during this period, check that your store charges ${filing.stateName} tax.`
    );
  }

  return {
    stateCode: filing.stateCode,
    stateName: filing.stateName,
    period: filing.period,
    periodLabel: describeFilingPeriod(filing.period, filing.periodStart, filing.periodEnd),
    periodStart: day(filing.periodStart),
    periodEnd: day(filing.periodEnd),
    direct: totals.direct,
    marketplace: totals.marketplace,
    warnings,
  };
}

export interface WorksheetOrder {
  orderDate: Date;
  orderNumber: string | null;
  platformOrderId: string;
  platform: string;
  shippingState: string | null;
  shippingCity: string | null;
  shippingZip: string | null;
  totalAmount: number;
  taxAmount: number;
  shippingAmount: number;
}

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  // Keep spreadsheet apps from treating a cell as a formula
  const safe = /^[=+\-@\t\r]/.test(text) && !/^-?\d/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** The period's orders for one state, as CSV (for the seller's records or an accountant). */
export function worksheetCsv(filing: FilingForWorksheet, orders: WorksheetOrder[]): string {
  const header = ['Order date', 'Order number', 'Sold through', 'Channel', 'Ship-to state', 'City', 'ZIP', 'Sales (excl. tax)', 'Shipping', 'Sales tax', 'Order total'];
  const lines = [header.join(',')];
  const sorted = orders
    .filter((o) => toStateCode(o.shippingState) === filing.stateCode)
    .sort((a, b) => a.orderDate.getTime() - b.orderDate.getTime());
  for (const o of sorted) {
    const channel = channelForPlatform(o.platform) === 'marketplace' ? 'Marketplace' : 'Own store';
    lines.push(
      [
        day(o.orderDate),
        o.orderNumber || o.platformOrderId,
        o.platform,
        channel,
        filing.stateCode,
        o.shippingCity,
        o.shippingZip,
        (o.totalAmount - o.taxAmount).toFixed(2),
        o.shippingAmount.toFixed(2),
        o.taxAmount.toFixed(2),
        o.totalAmount.toFixed(2),
      ]
        .map(csvCell)
        .join(',')
    );
  }
  return `${lines.join('\n')}\n`;
}

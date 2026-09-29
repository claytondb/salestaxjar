/**
 * Read order exports (CSV) in the browser and turn them into NexusOrders for
 * the nexus engine. Used by the free exposure scan: files never leave the
 * seller's computer.
 *
 * Understands Shopify order exports, Amazon order reports, Etsy "Sold
 * Orders" exports, and any CSV with a date, a ship-to state and an order
 * total (most WooCommerce export plugins, spreadsheets, other platforms).
 */

import type { NexusOrder, SalesChannel } from './nexus-engine';
import { toCountryCode, toStateCode } from './us-states';

// ─── CSV ─────────────────────────────────────────────────────────────────────

/** RFC 4180 CSV: quoted fields, escaped quotes, newlines inside quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // strip BOM

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

/** Tab-separated files (Amazon reports are often .txt with tabs). */
function parseDelimited(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  if (tabs > commas) {
    return text
      .split(/\r?\n/)
      .filter((l) => l.trim() !== '')
      .map((l) => l.split('\t'));
  }
  return parseCsv(text);
}

export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/^﻿/, '')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Values ──────────────────────────────────────────────────────────────────

export function parseMoney(value: string | undefined): number | null {
  if (value === undefined) return null;
  let v = value.trim();
  if (!v) return null;
  let negative = false;
  if (/^\(.*\)$/.test(v)) {
    negative = true;
    v = v.slice(1, -1);
  }
  v = v.replace(/[^0-9.,\-]/g, '');
  if (!/\d/.test(v)) return null;
  // "1.234,56" (European) → 1234.56 ; "1,234.56" → 1234.56
  if (/,\d{2}$/.test(v) && v.includes('.') && v.lastIndexOf(',') > v.lastIndexOf('.')) {
    v = v.replace(/\./g, '').replace(',', '.');
  } else {
    v = v.replace(/,/g, '');
  }
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return negative ? -Math.abs(n) : n;
}

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** Parses the date formats stores export. Dates without a time zone are read as UTC. */
export function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;

  // 2026-03-01 10:15:00 -0500 (Shopify) / 2026-03-01T10:15:00Z / 2026-03-01
  let m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(Z|[+-]\d{2}:?\d{2}|UTC)?)?/.exec(v);
  if (m) {
    const [, y, mo, d, h = '00', mi = '00', s = '00', tz] = m;
    let iso = `${y}-${mo}-${d}T${h}:${mi}:${s}`;
    if (!tz || tz === 'UTC' || tz === 'Z') iso += 'Z';
    else iso += tz.length === 5 ? `${tz.slice(0, 3)}:${tz.slice(3)}` : tz;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // 03/01/2026 or 3/1/26 (US month/day/year), optional time
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})(?!\d)/.exec(v);
  if (m) {
    const month = Number(m[1]) - 1;
    const day = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    const date = new Date(Date.UTC(year, month, day, 12));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // Mar 1, 2026 / 1 Mar 2026
  m = /^([A-Za-z]{3})[a-z]*\.? (\d{1,2}),? (\d{4})/.exec(v) ?? null;
  if (m && MONTHS[m[1].toLowerCase()] !== undefined) {
    return new Date(Date.UTC(Number(m[3]), MONTHS[m[1].toLowerCase()], Number(m[2]), 12));
  }
  m = /^(\d{1,2}) ([A-Za-z]{3})[a-z]*\.? (\d{4})/.exec(v);
  if (m && MONTHS[m[2].toLowerCase()] !== undefined) {
    return new Date(Date.UTC(Number(m[3]), MONTHS[m[2].toLowerCase()], Number(m[1]), 12));
  }

  const fallback = new Date(v);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

const NOT_A_SALE = /cancel|refund|void|fail|declin|pending payment|draft|trash/i;

/** Cancelled, refunded, voided… orders don't count. Partly refunded ones do (minus the refund). */
export function isNotASale(status: string): boolean {
  if (/partial/i.test(status)) return false;
  return NOT_A_SALE.test(status);
}

// ─── Formats ─────────────────────────────────────────────────────────────────

export type CsvFormat = 'shopify' | 'amazon' | 'etsy' | 'generic';

export const FORMAT_LABELS: Record<CsvFormat, string> = {
  shopify: 'Shopify orders export',
  amazon: 'Amazon order report',
  etsy: 'Etsy sold orders export',
  generic: 'Order export',
};

const SYNONYMS = {
  // Not "name": outside Shopify exports that's usually the customer's name.
  id: ['order id', 'order number', 'order no', 'order #', 'order', 'amazon order id', 'sales order id', 'order id number', 'id'],
  date: ['created at', 'order date', 'purchase date', 'sale date', 'date created', 'order created', 'order created at', 'date', 'paid at', 'transaction date', 'posted date', 'order date (gmt)'],
  state: ['shipping province', 'shipping province code', 'ship state', 'shipping state', 'ship to state', 'shipping state code', 'state code (shipping)', 'state (shipping)', 'shipping region', 'delivery state', 'state', 'province', 'region'],
  country: ['shipping country', 'shipping country code', 'country code (shipping)', 'country (shipping)', 'ship country', 'ship to country', 'delivery country', 'country', 'country code'],
  // Used when an order has no ship-to address (digital products)
  billingState: ['billing province', 'billing province code', 'billing state', 'billing state code', 'state code (billing)', 'state (billing)', 'billing region'],
  billingCountry: ['billing country', 'billing country code', 'country code (billing)', 'country (billing)'],
  total: ['total', 'order total', 'grand total', 'order total amount', 'total price', 'order amount', 'total amount', 'amount', 'order value', 'sales amount'],
  tax: ['taxes', 'tax', 'sales tax', 'total tax', 'tax total', 'order tax', 'order total tax', 'order total tax amount', 'order tax amount', 'total tax collected', 'tax amount', 'tax collected'],
  status: ['financial status', 'order status', 'status'],
  cancelled: ['cancelled at', 'canceled at'],
  refunded: ['refunded amount', 'refund amount', 'total refunded'],
} as const;

type Field = keyof typeof SYNONYMS;

function findColumn(headers: string[], field: Field): number {
  for (const name of SYNONYMS[field]) {
    const i = headers.indexOf(name);
    if (i >= 0) return i;
  }
  return -1;
}

export function detectFormat(rawHeaders: string[]): CsvFormat | null {
  const headers = normalizeHeaders(rawHeaders);
  const h = new Set(headers);
  if (h.has('name') && h.has('financial status') && (h.has('shipping province') || h.has('lineitem name'))) return 'shopify';
  if (h.has('amazon order id') && h.has('purchase date')) return 'amazon';
  if (h.has('sale date') && h.has('ship state') && (h.has('order total') || h.has('order value'))) return 'etsy';
  const hasState = findColumn(headers, 'state') >= 0 || findColumn(headers, 'billingState') >= 0;
  if (findColumn(headers, 'date') >= 0 && hasState && findColumn(headers, 'total') >= 0) return 'generic';
  return null;
}

function normalizeHeaders(headers: string[]): string[] {
  return headers.map(normalizeHeader);
}

/** An order read from a file. The id lets the scan spot the same order in two files. */
export interface FileOrder extends NexusOrder {
  /** The order's id or number in the file (null when the file has none) */
  orderId: string | null;
  /**
   * The platform's own id for the order when the file has one — Shopify's
   * numeric "Id" column, which matches the id Sails gets from Shopify's API,
   * so an imported file and a store sync don't double-count.
   */
  externalId: string | null;
  /** Stable key within this file: "id:<order id>" or "row:<row number>" */
  rowKey: string;
  /** Sales tax on the order, when the file shows it (0 otherwise) */
  tax: number;
}

export interface ParsedOrderFile {
  format: CsvFormat;
  label: string;
  channel: SalesChannel;
  orders: FileOrder[];
  rows: number;
  skipped: {
    notSales: number;
    noState: number;
    outsideUS: number;
    noDate: number;
    /** Amazon: orders from the seller's own site that Amazon only fulfilled */
    otherChannel: number;
  };
  /** True when the file had no tax column, so totals may include tax */
  missingTax: boolean;
  dateRange: { from: Date; to: Date } | null;
}

export interface ParseOptions {
  /** Override the channel (e.g. a generic export from a marketplace) */
  channel?: SalesChannel;
}

export function parseOrderFile(text: string, options: ParseOptions = {}): ParsedOrderFile | { error: string } {
  const rows = parseDelimited(text);
  if (rows.length < 2) return { error: "This file doesn't have any order rows." };
  const headers = normalizeHeaders(rows[0]);
  const format = detectFormat(headers);
  if (!format) {
    return {
      error:
        "Sails couldn't find the columns it needs. The file should have an order date, a ship-to state and an order total — for example a Shopify orders export, an Amazon order report or an Etsy sold orders export.",
    };
  }

  const col = (field: Field) => findColumn(headers, field);
  const channel: SalesChannel = options.channel ?? (format === 'amazon' || format === 'etsy' ? 'marketplace' : 'direct');
  const skipped = { notSales: 0, noState: 0, outsideUS: 0, noDate: 0, otherChannel: 0 };

  // Group rows into orders: Shopify and Amazon use one row per line item.
  interface Draft {
    date: Date | null;
    state: string;
    country: string;
    billingState: string;
    billingCountry: string;
    otherChannel: boolean;
    externalId: string;
    total: number;
    tax: number;
    refunded: number;
    notSale: boolean;
    hasTotal: boolean;
  }
  const drafts = new Map<string, Draft>();
  const idCol = format === 'amazon' ? headers.indexOf('amazon order id') : format === 'shopify' ? headers.indexOf('name') : col('id');
  // Shopify exports also carry the order's numeric id (on the order's first row)
  const externalIdCol = format === 'shopify' ? headers.indexOf('id') : -1;
  const get = (row: string[], i: number) => (i >= 0 ? (row[i] ?? '').trim() : '');

  const amazon = format === 'amazon'
    ? {
        itemPrice: headers.indexOf('item price'),
        itemTax: headers.indexOf('item tax'),
        shippingPrice: headers.indexOf('shipping price'),
        shippingTax: headers.indexOf('shipping tax'),
        itemDiscount: headers.indexOf('item promotion discount'),
        shipDiscount: headers.indexOf('ship promotion discount'),
        itemStatus: headers.indexOf('item status'),
        salesChannel: headers.indexOf('sales channel'),
        status: headers.indexOf('order status'),
      }
    : null;

  const dateCol = format === 'amazon' ? headers.indexOf('purchase date') : format === 'etsy' ? headers.indexOf('sale date') : col('date');
  const stateCol = format === 'etsy' ? headers.indexOf('ship state') : format === 'amazon' ? headers.indexOf('ship state') : col('state');
  const countryCol = format === 'amazon' ? headers.indexOf('ship country') : col('country');
  const totalCol = format === 'etsy' && headers.includes('order total') ? headers.indexOf('order total') : col('total');
  const taxCol = format === 'etsy' && headers.includes('sales tax') ? headers.indexOf('sales tax') : col('tax');
  const billingStateCol = col('billingState');
  const billingCountryCol = col('billingCountry');
  const statusCol = col('status');
  const cancelledCol = col('cancelled');
  const refundedCol = col('refunded');

  rows.slice(1).forEach((row, index) => {
    const id = get(row, idCol) ? `id:${get(row, idCol)}` : `row:${index}`;
    let d = drafts.get(id);
    if (!d) {
      d = {
        date: null,
        state: '',
        country: '',
        billingState: '',
        billingCountry: '',
        otherChannel: false,
        externalId: '',
        total: 0,
        tax: 0,
        refunded: 0,
        notSale: false,
        hasTotal: false,
      };
      drafts.set(id, d);
    }
    // Order-level fields: take the first non-empty value
    if (!d.date) d.date = parseDate(get(row, dateCol));
    if (!d.state) d.state = get(row, stateCol);
    if (!d.country) d.country = get(row, countryCol);
    if (!d.billingState) d.billingState = get(row, billingStateCol);
    if (!d.billingCountry) d.billingCountry = get(row, billingCountryCol);
    if (!d.externalId) d.externalId = get(row, externalIdCol);
    const status = amazon ? get(row, amazon.status) : get(row, statusCol);
    if (isNotASale(status) || get(row, cancelledCol)) d.notSale = true;

    if (amazon) {
      // "Non-Amazon" orders came from the seller's own site; Amazon only shipped them.
      if (/^non-amazon/i.test(get(row, amazon.salesChannel))) d.otherChannel = true;
      if (/cancel/i.test(get(row, amazon.itemStatus))) return;
      // Discounts are listed as positive or negative numbers depending on the report
      d.total +=
        (parseMoney(get(row, amazon.itemPrice)) ?? 0) +
        (parseMoney(get(row, amazon.shippingPrice)) ?? 0) -
        Math.abs(parseMoney(get(row, amazon.itemDiscount)) ?? 0) -
        Math.abs(parseMoney(get(row, amazon.shipDiscount)) ?? 0);
      d.tax += (parseMoney(get(row, amazon.itemTax)) ?? 0) + (parseMoney(get(row, amazon.shippingTax)) ?? 0);
    } else if (!d.hasTotal) {
      // Order totals: take them from the first row that has them. (Shopify
      // puts them only on an order's first row; line-item exports from other
      // tools usually repeat them on every row.)
      const total = parseMoney(get(row, totalCol));
      if (total !== null) {
        d.total = total;
        d.tax = parseMoney(get(row, taxCol)) ?? 0;
        d.refunded = parseMoney(get(row, refundedCol)) ?? 0;
        d.hasTotal = true;
      }
    }
  });

  const orders: FileOrder[] = [];
  let from: Date | null = null;
  let to: Date | null = null;
  for (const [key, d] of drafts) {
    if (d.otherChannel) {
      skipped.otherChannel++;
      continue;
    }
    if (d.notSale) {
      skipped.notSales++;
      continue;
    }
    if (!d.date) {
      skipped.noDate++;
      continue;
    }
    // No ship-to address (digital products): the billing address says where the sale went
    const useBilling = !d.state && !!d.billingState;
    const countryValue = useBilling ? d.billingCountry : d.country;
    const country = countryValue ? toCountryCode(countryValue) : 'US';
    if (country !== 'US') {
      skipped.outsideUS++;
      continue;
    }
    const stateCode = toStateCode(useBilling ? d.billingState : d.state);
    if (!stateCode) {
      skipped.noState++;
      continue;
    }
    // Amazon: prices exclude tax already. Others: total includes tax.
    const sales = amazon ? d.total : d.total - d.tax - Math.max(0, d.refunded);
    const orderId = key.startsWith('id:') ? key.slice(3) : null;
    orders.push({
      date: d.date,
      stateCode,
      sales: Math.max(0, sales),
      channel,
      orderId,
      externalId: d.externalId || null,
      rowKey: key,
      tax: Math.max(0, Math.round(d.tax * 100) / 100),
    });
    if (!from || d.date < from) from = d.date;
    if (!to || d.date > to) to = d.date;
  }

  return {
    format,
    label: FORMAT_LABELS[format],
    channel,
    orders,
    rows: rows.length - 1,
    skipped,
    missingTax: !amazon && taxCol < 0,
    dateRange: from && to ? { from, to } : null,
  };
}

/**
 * Combine orders from several files. The same order can show up twice when
 * exports overlap (say, "last year" and "all orders"); it's counted once.
 */
export function combineOrderFiles(files: ParsedOrderFile[]): { orders: NexusOrder[]; duplicates: number } {
  const seen = new Set<string>();
  const orders: NexusOrder[] = [];
  let duplicates = 0;
  for (const file of files) {
    for (const order of file.orders) {
      if (order.orderId) {
        const key = `${file.format}:${order.orderId}`;
        if (seen.has(key)) {
          duplicates++;
          continue;
        }
        seen.add(key);
      }
      orders.push({ date: order.date, stateCode: order.stateCode, sales: order.sales, channel: order.channel });
    }
  }
  return { orders, duplicates };
}

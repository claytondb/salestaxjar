/**
 * Turning order exports (read in the browser by order-csv.ts) into the small
 * records Sails stores. Shared by the import screen and the import API.
 *
 * Only what nexus tracking and reports need leaves the browser: an order id,
 * the date, the ship-to state, sales and tax. No names, emails or addresses.
 */

import type { SalesChannel } from './nexus-engine';
import type { CsvFormat, ParsedOrderFile } from './order-csv';

/** Stored as ImportedOrder.platformConnectionId for orders that came from a file. */
export const FILE_IMPORT_CONNECTION_ID = 'file-import';

/**
 * Where file orders are stored. Known exports use the platform's own name
 * and ids, so a file import and a store sync (or the Amazon report upload)
 * update the same orders instead of counting them twice.
 */
export const FILE_IMPORT_PLATFORMS = ['shopify', 'amazon', 'etsy', 'upload', 'upload-marketplace'] as const;
export type FileImportPlatform = (typeof FILE_IMPORT_PLATFORMS)[number];

export const FILE_IMPORT_PLATFORM_LABELS: Record<FileImportPlatform, string> = {
  shopify: 'Shopify exports',
  amazon: 'Amazon order reports',
  etsy: 'Etsy exports',
  upload: 'Other store exports',
  'upload-marketplace': 'Other marketplace exports',
};

/** The same, for use mid-sentence ("imported from …") */
export const FILE_IMPORT_SOURCE_PHRASES: Record<FileImportPlatform, string> = {
  shopify: 'Shopify exports',
  amazon: 'Amazon order reports',
  etsy: 'Etsy exports',
  upload: 'other store exports',
  'upload-marketplace': 'other marketplace exports',
};

/** Orders per request: small enough for the request size limit, big enough to be quick. */
export const IMPORT_BATCH_SIZE = 1000;

export interface ImportOrderInput {
  /** The id Sails stores the order under (unique per platform) */
  id: string;
  /** The order number people know it by (e.g. "#1001"), when that's not the id */
  number?: string;
  /** ISO date-time */
  date: string;
  /** Two-letter state code */
  state: string;
  sales: number;
  tax: number;
}

export interface ImportBatch {
  platform: FileImportPlatform;
  orders: ImportOrderInput[];
}

export function platformForFile(format: CsvFormat, channel: SalesChannel): FileImportPlatform {
  if (format === 'shopify') return 'shopify';
  if (format === 'amazon') return 'amazon';
  if (format === 'etsy') return 'etsy';
  return channel === 'marketplace' ? 'upload-marketplace' : 'upload';
}

/** Short, stable hash (FNV-1a, 32-bit) for orders a file gives no id for. */
function hash(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** The id an order is stored under. */
export function importIdFor(
  order: ParsedOrderFile['orders'][number],
  format: CsvFormat
): string {
  if (format === 'shopify' && order.externalId) return order.externalId;
  if (order.orderId) return order.orderId.slice(0, 120);
  // No id in the file: same file, same row → same id, so re-importing doesn't duplicate
  return `row-${hash(`${order.date.toISOString()}|${order.stateCode}|${order.sales.toFixed(2)}|${order.rowKey}`)}`;
}

/**
 * Group the orders from all files by where they're stored, drop duplicates
 * (overlapping exports), and split into request-sized batches.
 */
export function buildImportBatches(files: ParsedOrderFile[], batchSize = IMPORT_BATCH_SIZE): ImportBatch[] {
  const byPlatform = new Map<FileImportPlatform, Map<string, ImportOrderInput>>();
  for (const file of files) {
    const platform = platformForFile(file.format, file.channel);
    const orders = byPlatform.get(platform) ?? new Map<string, ImportOrderInput>();
    for (const order of file.orders) {
      const id = importIdFor(order, file.format);
      if (orders.has(id)) continue;
      const number = order.orderId && order.orderId !== id ? order.orderId.slice(0, 120) : undefined;
      orders.set(id, {
        id,
        ...(number ? { number } : {}),
        date: order.date.toISOString(),
        state: order.stateCode,
        sales: Math.round(order.sales * 100) / 100,
        tax: Math.round(order.tax * 100) / 100,
      });
    }
    byPlatform.set(platform, orders);
  }

  const batches: ImportBatch[] = [];
  for (const [platform, orders] of byPlatform) {
    const list = [...orders.values()].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 0; i < list.length; i += batchSize) {
      batches.push({ platform, orders: list.slice(i, i + batchSize) });
    }
  }
  return batches;
}

export function countImportOrders(batches: ImportBatch[]): number {
  return batches.reduce((sum, b) => sum + b.orders.length, 0);
}

/**
 * Before importing: roughly how many orders fall in months with more orders
 * than the plan counts. (The server has the final say — orders already in
 * Sails for a month use up that month's room too.)
 */
export function estimateOverLimit(
  batches: ImportBatch[],
  monthlyLimit: number | null
): { months: number; orders: number } {
  if (monthlyLimit === null) return { months: 0, orders: 0 };
  const perMonth = new Map<string, number>();
  for (const batch of batches) {
    for (const order of batch.orders) {
      const month = order.date.slice(0, 7); // ISO date → "YYYY-MM" (UTC, like the server's cap)
      perMonth.set(month, (perMonth.get(month) ?? 0) + 1);
    }
  }
  let months = 0;
  let orders = 0;
  for (const count of perMonth.values()) {
    if (count > monthlyLimit) {
      months++;
      orders += count - monthlyLimit;
    }
  }
  return { months, orders };
}

/** What the import API says about one batch. */
export interface ImportBatchResult {
  imported: number;
  rejected: number;
  failed: number;
  skippedOverLimit: number;
  monthlyLimit: number | null;
  newAlerts?: number;
}

export interface ImportTotals {
  imported: number;
  rejected: number;
  failed: number;
  skippedOverLimit: number;
  newAlerts: number;
  monthlyLimit: number | null;
  /** Orders sent so far (saved or not) */
  sent: number;
}

/**
 * Send the batches one after another, adding up what the server reports.
 * Stops at the first batch that fails; what was saved before stays saved, and
 * importing again is safe (orders are updated, not duplicated).
 */
export async function runImportBatches(
  batches: ImportBatch[],
  send: (batch: ImportBatch, final: boolean) => Promise<ImportBatchResult>,
  onProgress?: (sent: number, total: number) => void
): Promise<{ totals: ImportTotals; error: string | null }> {
  const total = countImportOrders(batches);
  const totals: ImportTotals = {
    imported: 0,
    rejected: 0,
    failed: 0,
    skippedOverLimit: 0,
    newAlerts: 0,
    monthlyLimit: null,
    sent: 0,
  };
  for (let i = 0; i < batches.length; i++) {
    try {
      const result = await send(batches[i], i === batches.length - 1);
      totals.imported += result.imported ?? 0;
      totals.rejected += result.rejected ?? 0;
      totals.failed += result.failed ?? 0;
      totals.skippedOverLimit += result.skippedOverLimit ?? 0;
      totals.newAlerts += result.newAlerts ?? 0;
      totals.monthlyLimit = result.monthlyLimit ?? null;
    } catch (error) {
      return { totals, error: error instanceof Error ? error.message : 'Import failed. Please try again.' };
    }
    totals.sent += batches[i].orders.length;
    onProgress?.(totals.sent, total);
  }
  return { totals, error: null };
}

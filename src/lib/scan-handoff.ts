/**
 * Hand the orders from the free nexus check to the signed-in import, so a
 * seller who checks their files and then creates an account can import them
 * in one click instead of adding the files again.
 *
 * Kept in sessionStorage: it stays in this browser tab, disappears when the
 * tab closes, and holds only what an import would send (order id, date,
 * ship-to state, sales and tax). Nothing is sent until the seller clicks
 * Import after signing in.
 */

import { FILE_IMPORT_PLATFORMS, countImportOrders, type ImportBatch } from './order-file-import';

const KEY = 'sails:free-check-orders';
/** Bigger scans are left out rather than risk the browser's storage limit. */
export const HANDOFF_MAX_ORDERS = 20_000;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface ScanHandoff {
  savedAt: number;
  /** File names, for the "from your free check" message */
  files: string[];
  orders: number;
  batches: ImportBatch[];
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function session(): Store | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveScanHandoff(files: string[], batches: ImportBatch[], store: Store | null = session(), now = Date.now()): boolean {
  if (!store) return false;
  const orders = countImportOrders(batches);
  try {
    if (orders === 0 || orders > HANDOFF_MAX_ORDERS) {
      store.removeItem(KEY);
      return false;
    }
    const value: ScanHandoff = { savedAt: now, files: files.slice(0, 20), orders, batches };
    store.setItem(KEY, JSON.stringify(value));
    return true;
  } catch {
    return false; // storage full or blocked: the seller can still add the files again
  }
}

function isBatch(value: unknown): value is ImportBatch {
  if (!value || typeof value !== 'object') return false;
  const b = value as ImportBatch;
  return (FILE_IMPORT_PLATFORMS as readonly string[]).includes(b.platform) && Array.isArray(b.orders);
}

export function loadScanHandoff(store: Store | null = session(), now = Date.now()): ScanHandoff | null {
  if (!store) return null;
  try {
    const raw = store.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as ScanHandoff;
    const fresh = typeof value.savedAt === 'number' && now - value.savedAt < MAX_AGE_MS;
    if (!fresh || !Array.isArray(value.batches) || !value.batches.every(isBatch) || !Array.isArray(value.files)) {
      store.removeItem(KEY);
      return null;
    }
    return { ...value, orders: countImportOrders(value.batches) };
  } catch {
    return null;
  }
}

export function clearScanHandoff(store: Store | null = session()): void {
  try {
    store?.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}

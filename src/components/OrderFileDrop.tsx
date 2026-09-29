'use client';

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Upload, X } from 'lucide-react';
import { combineOrderFiles, parseOrderFile, type ParsedOrderFile } from '@/lib/order-csv';
import type { SalesChannel } from '@/lib/nexus-engine';

/**
 * Adding order exports (Shopify, Amazon, Etsy or any CSV) and reading them in
 * the browser. Used by the free nexus check and by the signed-in import;
 * neither sends the files anywhere.
 */

export interface LoadedOrderFile {
  id: string;
  name: string;
  text: string;
  result: ParsedOrderFile | { error: string };
}

export const EXPORT_HELP: { name: string; steps: string }[] = [
  { name: 'Shopify', steps: 'Orders → Export → All orders → "CSV for Excel, Numbers, or other spreadsheet programs". Bigger exports arrive by email.' },
  { name: 'Amazon', steps: 'Seller Central → Reports → Fulfillment → All Orders (or Order Reports). Pick the date range and download.' },
  { name: 'Etsy', steps: 'Shop Manager → Settings → Options → Download Data → Orders CSV. Download each year you need.' },
  { name: 'WooCommerce and others', steps: 'Any order export with an order date, ship-to state and order total works — for example from an order export plugin.' },
];

export function formatDay(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
}

/** Parse without letting an unexpected file take the page down. */
function readFile(text: string, channel?: SalesChannel): ParsedOrderFile | { error: string } {
  try {
    return parseOrderFile(text, channel ? { channel } : {});
  } catch {
    return { error: "Sails couldn't read this file. Make sure it's a CSV or tab-separated export." };
  }
}

/** "Left out: 3 cancelled or refunded, 1 outside the US" — only the reasons that apply. */
export function leftOutSummary(skipped: ParsedOrderFile['skipped']): string | null {
  const parts = [
    skipped.notSales > 0 && `${skipped.notSales.toLocaleString('en-US')} cancelled or refunded`,
    skipped.outsideUS > 0 && `${skipped.outsideUS.toLocaleString('en-US')} outside the US`,
    skipped.noState > 0 && `${skipped.noState.toLocaleString('en-US')} with no US state`,
    skipped.noDate > 0 && `${skipped.noDate.toLocaleString('en-US')} with no readable date`,
    skipped.otherChannel > 0 &&
      `${skipped.otherChannel.toLocaleString('en-US')} Amazon shipped for your other sales channels (count those in that channel's export)`,
  ].filter(Boolean);
  return parts.length ? `Left out: ${parts.join(', ')}.` : null;
}

/** The files a seller has added, read and ready to use. */
export function useOrderFiles() {
  const [files, setFiles] = useState<LoadedOrderFile[]>([]);
  const [reading, setReading] = useState(false);

  const addFiles = useCallback(async (list: FileList | File[]) => {
    const incoming = Array.from(list);
    if (incoming.length === 0) return;
    setReading(true);
    // Let the "Reading…" message paint before the (synchronous) parsing starts
    await new Promise((resolve) => setTimeout(resolve, 30));
    const loaded: LoadedOrderFile[] = [];
    for (const file of incoming) {
      let text = '';
      try {
        text = await file.text();
      } catch {
        // handled below as an unreadable file
      }
      loaded.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        text,
        result: text ? readFile(text) : { error: "Sails couldn't open this file." },
      });
    }
    setFiles((prev) => [...prev.filter((p) => !loaded.some((l) => l.id === p.id)), ...loaded]);
    setReading(false);
  }, []);

  const setChannel = useCallback((id: string, channel: SalesChannel) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, result: readFile(f.text, channel) } : f)));
  }, []);

  const removeFile = useCallback((id: string) => setFiles((prev) => prev.filter((f) => f.id !== id)), []);
  const clear = useCallback(() => setFiles([]), []);

  const parsed = useMemo(() => files.flatMap((f) => ('error' in f.result ? [] : [f.result])), [files]);
  const combined = useMemo(() => combineOrderFiles(parsed), [parsed]);

  return { files, reading, addFiles, setChannel, removeFile, clear, parsed, combined };
}

export type OrderFilesState = ReturnType<typeof useOrderFiles>;

interface OrderFileDropProps {
  state: OrderFilesState;
  /**
   * Which files the seller can mark as own store or marketplace sales.
   * "generic": only files Sails doesn't recognize (Shopify is always your own
   * store; Amazon and Etsy are always marketplaces).
   */
  channelChoice?: 'all' | 'generic';
  /** Called after files are added (for example, to leave sample mode) */
  onAdd?: () => void;
  /** More buttons beside "Choose files" */
  actions?: ReactNode;
  /** Shown under the drop zone, above the file list */
  notice?: ReactNode;
  /** While files are being used (say, imported): no adding, removing or changing */
  disabled?: boolean;
  /** Shown after the file list, before the export help (e.g. an Import button) */
  children?: ReactNode;
}

export default function OrderFileDrop({
  state,
  channelChoice = 'all',
  onAdd,
  actions,
  notice,
  disabled = false,
  children,
}: OrderFileDropProps) {
  const { files, reading, addFiles, setChannel, removeFile, combined } = state;
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (list: FileList | File[]) => {
    if (disabled) return;
    void addFiles(list).then(() => onAdd?.());
  };

  return (
    <>
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive ? 'border-theme-accent bg-accent-subtle' : 'border-theme-secondary'
        } ${disabled ? 'opacity-60' : ''}`}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files?.length) add(e.dataTransfer.files);
        }}
      >
        <Upload className="w-10 h-10 mx-auto mb-3 text-theme-muted" aria-hidden />
        <p className="text-lg font-medium text-theme-primary">Drop your order exports here</p>
        <p className="text-sm text-theme-muted mb-4">CSV or tab-separated files. Add as many as you like — one per store or marketplace.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="btn-theme-primary px-5 py-2.5 rounded-lg font-medium disabled:opacity-50"
          >
            Choose files
          </button>
          {actions}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt,.tsv,text/csv,text/plain"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) add(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {reading && (
        <p className="mt-4 text-sm text-theme-secondary" role="status">
          Reading your files…
        </p>
      )}

      {notice}

      {files.length > 0 && (
        <ul className="mt-5 space-y-3">
          {files.map((f) => (
            <li key={f.id} className="rounded-lg border border-theme-primary p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-theme-primary truncate">{f.name}</p>
                  {'error' in f.result ? (
                    <p className="text-red-500 mt-1">{f.result.error}</p>
                  ) : (
                    <>
                      <p className="text-theme-secondary mt-1">
                        {f.result.label} · {plural(f.result.orders.length, 'US order')} counted
                        {f.result.dateRange ? ` · ${formatDay(f.result.dateRange.from)} to ${formatDay(f.result.dateRange.to)}` : ''}
                      </p>
                      {leftOutSummary(f.result.skipped) && (
                        <p className="text-theme-muted mt-1">{leftOutSummary(f.result.skipped)}</p>
                      )}
                      {f.result.missingTax && (
                        <p className="text-yellow-600 mt-1">No tax column found, so totals may include sales tax.</p>
                      )}
                      {(channelChoice === 'all' || f.result.format === 'generic') && (
                        <fieldset className="mt-2 flex flex-wrap gap-4 text-theme-secondary" disabled={disabled}>
                          <legend className="sr-only">Where were these sales made?</legend>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="radio"
                              name={`channel-${f.id}`}
                              checked={f.result.channel === 'direct'}
                              onChange={() => setChannel(f.id, 'direct')}
                            />
                            My own store
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="radio"
                              name={`channel-${f.id}`}
                              checked={f.result.channel === 'marketplace'}
                              onChange={() => setChannel(f.id, 'marketplace')}
                            />
                            A marketplace (Amazon, Etsy, eBay…)
                          </label>
                        </fieldset>
                      )}
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(f.id)}
                  disabled={disabled}
                  className="text-theme-muted hover:text-theme-primary p-1 disabled:opacity-50"
                  aria-label={`Remove ${f.name}`}
                >
                  <X className="w-4 h-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {combined.duplicates > 0 && (
        <p className="mt-3 text-sm text-theme-secondary">
          {plural(combined.duplicates, 'order was', 'orders were')} in more than one file, so{' '}
          {combined.duplicates === 1 ? 'it was' : 'they were'} counted once.
        </p>
      )}

      {children}

      <details className="mt-6 text-sm">
        <summary className="cursor-pointer text-theme-accent font-medium">How to export your orders</summary>
        <ul className="mt-3 space-y-2 text-theme-secondary">
          {EXPORT_HELP.map((h) => (
            <li key={h.name}>
              <span className="font-medium text-theme-primary">{h.name}:</span> {h.steps}
            </li>
          ))}
          <li>
            Include everything from <span className="font-medium text-theme-primary">January 1 of last year</span> to
            today — that&apos;s the longest period most states look at.
          </li>
        </ul>
      </details>
    </>
  );
}

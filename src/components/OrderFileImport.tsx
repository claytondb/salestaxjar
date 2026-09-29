'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, CheckCircle, Loader2, Lock } from 'lucide-react';
import OrderFileDrop, { formatDay, plural, useOrderFiles } from '@/components/OrderFileDrop';
import {
  FILE_IMPORT_PLATFORM_LABELS,
  FILE_IMPORT_SOURCE_PHRASES,
  buildImportBatches,
  countImportOrders,
  estimateOverLimit,
  runImportBatches,
  type FileImportPlatform,
  type ImportBatch,
  type ImportBatchResult,
  type ImportTotals,
} from '@/lib/order-file-import';

interface ImportSummary {
  platform: FileImportPlatform;
  orders: number;
  from: string | null;
  to: string | null;
  lastImported: string | null;
}

interface SummaryResponse {
  imports: ImportSummary[];
  monthlyLimit: number | null;
  planName: string;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Send one batch; retries brief network hiccups, busy servers and rate limits. */
async function sendBatch(batch: ImportBatch, final: boolean): Promise<ImportBatchResult> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch('/api/orders/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: batch.platform, orders: batch.orders, final }),
      });
    } catch {
      if (attempt < 2) {
        await wait(2000);
        continue;
      }
      throw new Error('Sails couldn’t be reached. Check your connection and import again — nothing is counted twice.');
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      await wait(res.status === 429 ? 20_000 : 3000);
      continue;
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 400) {
      throw new Error(
        `Some orders couldn’t be saved${data.error ? ` (${data.error})` : ''}. Try again, or email support@sails.tax if it keeps happening.`
      );
    }
    if (!res.ok) {
      throw new Error(data.message || data.error || 'The import stopped. Please try again — nothing is counted twice.');
    }
    return data as ImportBatchResult;
  }
}

function dateRange(from: string | null, to: string | null): string {
  if (!from || !to) return '';
  return ` · ${formatDay(new Date(from))} to ${formatDay(new Date(to))}`;
}

/**
 * Settings → Platforms: import order history from exports. The files are read
 * in the browser (like the free nexus check); only each order's id, date,
 * ship-to state, sales and tax are sent.
 */
export default function OrderFileImport() {
  const fileState = useOrderFiles();
  const { parsed, clear } = fileState;
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ sent: number; total: number } | null>(null);
  const [result, setResult] = useState<{ totals: ImportTotals; error: string | null } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<FileImportPlatform | null>(null);
  const [removing, setRemoving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/orders/import');
      if (res.ok) setSummary(await res.json());
    } catch {
      // The summary is a nice-to-have; importing still works without it
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const batches = useMemo(() => buildImportBatches(parsed), [parsed]);
  const orderCount = countImportOrders(batches);
  const monthlyLimit = summary?.monthlyLimit ?? null;
  const overLimit = useMemo(() => estimateOverLimit(batches, monthlyLimit), [batches, monthlyLimit]);

  const startImport = async () => {
    if (batches.length === 0 || importing) return;
    setImporting(true);
    setResult(null);
    setNotice(null);
    setProgress({ sent: 0, total: orderCount });
    const outcome = await runImportBatches(batches, sendBatch, (sent, total) => setProgress({ sent, total }));
    setResult(outcome);
    setImporting(false);
    setProgress(null);
    if (!outcome.error) clear();
    void loadSummary();
  };

  const remove = async (platform: FileImportPlatform) => {
    setRemoving(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/orders/import?platform=${encodeURIComponent(platform)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Remove failed');
      setNotice(`Removed ${plural(data.removed ?? 0, 'order')} imported from ${FILE_IMPORT_SOURCE_PHRASES[platform]}.`);
      setResult(null);
    } catch {
      setNotice('Those orders couldn’t be removed. Please try again.');
    } finally {
      setRemoving(false);
      setConfirmRemove(null);
      void loadSummary();
    }
  };

  const imports = summary?.imports ?? [];
  const totals = result?.totals;

  return (
    <div className="space-y-5">
      {imports.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-theme-primary mb-2">Imported so far</h3>
          <ul className="rounded-lg border border-theme-primary text-sm">
            {imports.map((imp) => (
              <li key={imp.platform} className="p-3 border-t border-theme-primary first:border-t-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-theme-secondary">
                    <span className="font-medium text-theme-primary">{FILE_IMPORT_PLATFORM_LABELS[imp.platform] ?? imp.platform}</span>
                    {' · '}
                    {plural(imp.orders, 'order')}
                    {dateRange(imp.from, imp.to)}
                  </p>
                  {confirmRemove !== imp.platform && (
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(imp.platform)}
                      disabled={importing || removing}
                      className="text-theme-muted hover:text-theme-primary underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {confirmRemove === imp.platform && (
                  <div className="mt-2 flex flex-wrap items-center gap-3 rounded-md p-3" style={{ backgroundColor: 'var(--error-bg)' }}>
                    <p className="text-theme-primary">
                      Remove the {plural(imp.orders, 'order')} imported from {FILE_IMPORT_SOURCE_PHRASES[imp.platform]}? Orders
                      from connected stores stay.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void remove(imp.platform)}
                        disabled={removing}
                        className="px-3 py-1.5 rounded-md font-medium disabled:opacity-50"
                        style={{ backgroundColor: 'var(--error-text)', color: 'white' }}
                      >
                        {removing ? 'Removing…' : 'Remove orders'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(null)}
                        disabled={removing}
                        className="px-3 py-1.5 rounded-md border border-theme-secondary text-theme-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {notice && (
        <p className="text-sm text-theme-secondary" role="status">
          {notice}
        </p>
      )}

      <OrderFileDrop
        state={fileState}
        channelChoice="generic"
        disabled={importing}
        onAdd={() => setResult(null)}
      >
        {orderCount > 0 && !importing && (
          <div className="mt-5 rounded-lg border border-theme-primary p-4 text-sm space-y-3">
            {overLimit.orders > 0 && monthlyLimit !== null && (
              <p className="text-theme-secondary">
                Your {summary?.planName ?? 'current'} plan counts up to {monthlyLimit.toLocaleString('en-US')} orders a month.{' '}
                {plural(overLimit.months, 'month')} in these files {overLimit.months === 1 ? 'has' : 'have'} more, so about{' '}
                {plural(overLimit.orders, 'order')} won&apos;t be counted.{' '}
                <Link href="/pricing" className="text-theme-accent underline">
                  Compare plans
                </Link>
              </p>
            )}
            <button
              type="button"
              onClick={() => void startImport()}
              className="btn-theme-primary px-5 py-2.5 rounded-lg font-medium inline-flex items-center gap-2"
            >
              Import {plural(orderCount, 'order')}
            </button>
          </div>
        )}

        {importing && progress && (
          <div className="mt-5 rounded-lg border border-theme-primary p-4 text-sm" role="status" aria-live="polite">
            <p className="text-theme-primary font-medium flex items-center gap-2 mb-2">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              Importing {progress.sent.toLocaleString('en-US')} of {plural(progress.total, 'order')}…
            </p>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--border-primary)' }}
              role="progressbar"
              aria-label="Import progress"
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={progress.sent}
            >
              <div
                className="h-full transition-all"
                style={{
                  width: `${progress.total ? Math.round((progress.sent / progress.total) * 100) : 0}%`,
                  backgroundColor: 'var(--accent-primary)',
                }}
              />
            </div>
            <p className="text-theme-muted mt-2">Keep this page open until it finishes.</p>
          </div>
        )}

        {result && totals && (
          <div
            className="mt-5 rounded-lg p-4 text-sm space-y-2"
            role={result.error ? 'alert' : 'status'}
            style={{
              backgroundColor: result.error ? 'var(--error-bg)' : 'var(--accent-bg)',
              border: `1px solid ${result.error ? 'var(--error-border)' : 'var(--border-accent)'}`,
            }}
          >
            <p className="font-medium text-theme-primary flex items-center gap-2">
              {result.error ? (
                <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--error-text)' }} aria-hidden />
              ) : (
                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--success)' }} aria-hidden />
              )}
              {result.error
                ? totals.imported > 0
                  ? `Imported ${plural(totals.imported, 'order')}, then the import stopped.`
                  : 'The import stopped.'
                : `Imported ${plural(totals.imported, 'order')}.`}
            </p>
            {result.error && <p className="text-theme-secondary">{result.error}</p>}
            {totals.skippedOverLimit > 0 && (
              <p className="text-theme-secondary">
                {plural(totals.skippedOverLimit, 'order')} {totals.skippedOverLimit === 1 ? 'wasn’t' : 'weren’t'} counted because{' '}
                {totals.skippedOverLimit === 1 ? 'its month is' : 'their months are'} over your plan&apos;s limit of{' '}
                {totals.monthlyLimit?.toLocaleString('en-US')} orders a month.{' '}
                <Link href="/pricing" className="text-theme-accent underline">
                  Compare plans
                </Link>
              </p>
            )}
            {totals.rejected > 0 && (
              <p className="text-theme-secondary">
                {plural(totals.rejected, 'order')} left out: not shipped to a US state, or dated before 2015 or in the future.
              </p>
            )}
            {totals.failed > 0 && (
              <p className="text-theme-secondary">
                {plural(totals.failed, 'order')} couldn&apos;t be saved. Importing the same files again will retry{' '}
                {totals.failed === 1 ? 'it' : 'them'}.
              </p>
            )}
            {totals.newAlerts > 0 && (
              <p className="text-theme-secondary">
                New threshold alerts for {plural(totals.newAlerts, 'state')}.
              </p>
            )}
            {!result.error && (
              <Link href="/nexus" className="inline-flex items-center gap-1 text-theme-accent font-medium">
                See where you may owe sales tax <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            )}
          </div>
        )}
      </OrderFileDrop>

      <p className="text-xs text-theme-muted flex items-start gap-2">
        <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden />
        Your files are read in your browser. Sails saves only each order&apos;s number, date, ship-to state, sales and tax — no
        names, emails or addresses. Importing the same orders again updates them instead of counting them twice.
      </p>
    </div>
  );
}

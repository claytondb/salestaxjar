'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Download, Loader2 } from 'lucide-react';
import type { FilingWorksheet } from '@/lib/filing-worksheet';
import { formatDueDate } from '@/lib/due-dates';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function orders(n: number): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? 'order' : 'orders'}`;
}

/**
 * "Prepare this return": the sales and tax for one filing's state and
 * period, from the orders in Sails, with a CSV of those orders.
 */
export default function FilingWorksheetPanel({ filingId }: { filingId: string }) {
  const [worksheet, setWorksheet] = useState<FilingWorksheet | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/filings/${encodeURIComponent(filingId)}/worksheet`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not prepare this return.');
        if (!cancelled) setWorksheet(data.worksheet);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not prepare this return.');
      });
    return () => {
      cancelled = true;
    };
  }, [filingId]);

  if (error) {
    return (
      <p className="text-sm" style={{ color: 'var(--error-text)' }} role="alert">
        {error}
      </p>
    );
  }
  if (!worksheet) {
    return (
      <p className="text-sm text-theme-muted flex items-center gap-2" role="status">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Adding up your orders…
      </p>
    );
  }

  const { direct, marketplace } = worksheet;
  const total = direct.sales + marketplace.sales;

  return (
    <div className="space-y-4 text-sm">
      <h4 className="font-semibold text-theme-primary">
        Your {worksheet.stateName} numbers for {worksheet.periodLabel}
      </h4>

      {worksheet.warnings.length > 0 && (
        <ul className="space-y-1.5">
          {worksheet.warnings.map((w) => (
            <li key={w} className="flex items-start gap-2 text-amber-600">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
              {w}
            </li>
          ))}
        </ul>
      )}

      <dl className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-theme-primary p-3">
          <dt className="text-theme-muted text-xs">Sales from your own store</dt>
          <dd className="text-lg font-semibold text-theme-primary">{money.format(direct.sales)}</dd>
          <dd className="text-theme-muted text-xs">
            {orders(direct.orders)}
            {direct.shipping > 0 ? `, including ${money.format(direct.shipping)} shipping` : ''}
          </dd>
        </div>
        <div className="rounded-lg border border-theme-primary p-3">
          <dt className="text-theme-muted text-xs">Sales tax you collected</dt>
          <dd className="text-lg font-semibold text-theme-primary">{money.format(direct.tax)}</dd>
          <dd className="text-theme-muted text-xs">On your own store&apos;s orders</dd>
        </div>
        <div className="rounded-lg border border-theme-primary p-3">
          <dt className="text-theme-muted text-xs">Marketplace sales</dt>
          <dd className="text-lg font-semibold text-theme-primary">{money.format(marketplace.sales)}</dd>
          <dd className="text-theme-muted text-xs">
            {orders(marketplace.orders)}. The marketplace collected and paid the tax on these.
          </dd>
        </div>
      </dl>

      <p className="text-theme-secondary">
        All sales into {worksheet.stateName}: <span className="font-medium text-theme-primary">{money.format(total)}</span>{' '}
        ({formatDueDate(`${worksheet.periodStart}T00:00:00Z`, { month: 'short', day: 'numeric' })} to{' '}
        {formatDueDate(`${worksheet.periodEnd}T00:00:00Z`)}). Returns usually ask for your total sales, the sales you can
        deduct (such as exempt sales, or marketplace sales where the state allows it), and the tax due. Check these totals
        against your store&apos;s own reports before you file — they only include the orders in Sails.
      </p>

      <a
        href={`/api/filings/${encodeURIComponent(filingId)}/worksheet?format=csv`}
        className="inline-flex items-center gap-1.5 text-theme-accent font-medium hover:underline"
        download
      >
        <Download className="w-4 h-4" aria-hidden />
        Download these orders (CSV)
      </a>
    </div>
  );
}

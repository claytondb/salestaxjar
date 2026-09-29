'use client';

import { useMemo, useState } from 'react';
import { offeredFilingPeriods, resolveFilingPeriod, type FilingPeriod } from '@/lib/filing-deadlines';
import type { FilingDeadline, NexusState } from '@/types';

const LABELS: Record<FilingPeriod, string> = { monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual' };

/**
 * How often the seller files in each state. States assign this at
 * registration; Sails starts with the usual frequency for a small seller.
 * Changing it replaces the state's upcoming unfiled returns.
 */
export default function FilingFrequencySettings({
  nexusStates,
  filings,
  onChanged,
}: {
  nexusStates: NexusState[];
  filings: FilingDeadline[];
  onChanged: () => Promise<void> | void;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // The frequency in use: the state's most recent filing, or the state's usual one
  const current = useMemo(() => {
    const latest = new Map<string, FilingDeadline>();
    for (const f of filings) {
      const prev = latest.get(f.stateCode);
      if (!prev || (f.periodStart ?? '') > (prev.periodStart ?? '')) latest.set(f.stateCode, f);
    }
    const result = new Map<string, FilingPeriod>();
    for (const s of nexusStates) {
      const offered = offeredFilingPeriods(s.stateCode);
      const fromFiling = latest.get(s.stateCode)?.period;
      result.set(s.stateCode, fromFiling && offered.includes(fromFiling) ? fromFiling : resolveFilingPeriod(s.stateCode));
    }
    return result;
  }, [filings, nexusStates]);

  const states = nexusStates.filter((s) => s.hasNexus && offeredFilingPeriods(s.stateCode).length > 0);
  if (states.length === 0) return null;

  const change = async (state: NexusState, period: FilingPeriod) => {
    setSaving(state.stateCode);
    setMessage(null);
    try {
      const res = await fetch('/api/filings/frequency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stateCode: state.stateCode, period }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not change the filing frequency.');
      await onChanged();
      setMessage({ text: `${state.state} now files ${LABELS[period].toLowerCase()}. Its upcoming due dates are updated.` });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Could not change the filing frequency.', error: true });
    } finally {
      setSaving(null);
    }
  };

  return (
    <details className="card-theme rounded-xl border border-theme-primary p-5 mb-6 group">
      <summary className="cursor-pointer font-semibold text-theme-primary">How often you file in each state</summary>
      <p className="text-sm text-theme-secondary mt-2 mb-4 max-w-2xl">
        Each state tells you how often to file when you register, usually based on how much tax you collect. Sails starts
        with the state&apos;s usual frequency for a small seller. Set it to match your registration notice, and your due
        dates and reminders will follow. Returns you&apos;ve already filed stay as they are.
      </p>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {states.map((s) => {
          const id = `frequency-${s.stateCode}`;
          const offered = offeredFilingPeriods(s.stateCode);
          if (offered.length === 1) {
            return (
              <li key={s.stateCode} className="flex items-center justify-between gap-3 rounded-lg border border-theme-primary px-3 py-2">
                <span className="text-sm text-theme-primary">{s.state}</span>
                <span className="text-sm text-theme-muted">{LABELS[offered[0]]} (the only option)</span>
              </li>
            );
          }
          return (
            <li key={s.stateCode} className="flex items-center justify-between gap-3 rounded-lg border border-theme-primary px-3 py-2">
              <label htmlFor={id} className="text-sm text-theme-primary">
                {s.state}
              </label>
              <select
                id={id}
                value={current.get(s.stateCode)}
                disabled={saving !== null}
                onChange={(e) => void change(s, e.target.value as FilingPeriod)}
                className="bg-theme-input border border-theme-secondary rounded-md px-2 py-1 text-sm text-theme-primary disabled:opacity-60"
              >
                {offered.map((p) => (
                  <option key={p} value={p}>
                    {LABELS[p]}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
      {(saving || message) && (
        <p
          className="text-sm mt-3"
          role={message?.error ? 'alert' : 'status'}
          style={message?.error ? { color: 'var(--error-text)' } : undefined}
        >
          {saving ? 'Updating due dates…' : message?.text}
        </p>
      )}
    </details>
  );
}

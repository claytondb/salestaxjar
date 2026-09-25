'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, ChevronDown, TrendingUp } from 'lucide-react';
import { NexusResultsView, formatDay, type NexusReportResponse } from '@/components/NexusResults';

interface NexusAlert {
  id: string;
  stateName: string;
  alertLevel: string;
  message: string;
  read: boolean;
  createdAt: string;
}

function RecentAlerts() {
  const [alerts, setAlerts] = useState<NexusAlert[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/nexus/alerts?limit=20')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.alerts) {
          setAlerts(data.alerts);
          setUnread(data.unreadCount ?? 0);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await fetch('/api/nexus/alerts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
      setUnread(0);
    } catch {
      // Non-critical
    }
  }, []);

  if (alerts.length === 0) return null;

  return (
    <details className="card-theme rounded-xl border border-theme-primary overflow-hidden">
      <summary className="cursor-pointer list-none p-4 flex items-center justify-between">
        <span className="flex items-center gap-2 font-semibold text-theme-primary">
          <Bell className="w-4 h-4" aria-hidden />
          Recent alerts
          {unread > 0 && <span className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5">{unread} new</span>}
        </span>
        <ChevronDown className="w-4 h-4 text-theme-muted" aria-hidden />
      </summary>
      <div className="border-t border-theme-primary">
        {unread > 0 && (
          <div className="px-4 pt-3">
            <button type="button" onClick={markAllRead} className="text-theme-accent text-sm hover:underline">
              Mark all read
            </button>
          </div>
        )}
        <ul className="divide-y divide-[var(--border-primary)] max-h-72 overflow-y-auto">
          {alerts.map((alert) => (
            <li key={alert.id} className={`p-4 ${!alert.read ? 'bg-white/5' : ''}`}>
              <p className="text-sm text-theme-primary">{alert.message}</p>
              <p className="text-xs text-theme-muted mt-1">{formatDay(alert.createdAt)}</p>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

export default function NexusExposure() {
  const [report, setReport] = useState<NexusReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/nexus/exposure');
        if (!response.ok) throw new Error('Could not load your nexus results. Please refresh the page.');
        const data = (await response.json()) as NexusReportResponse;
        if (!cancelled) setReport(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load your nexus results.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" role="status" aria-label="Loading nexus results">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-theme-accent"></div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="rounded-xl p-6 card-theme border border-red-500/30">
        <p className="text-red-500">{error ?? 'Could not load your nexus results.'}</p>
      </div>
    );
  }

  if (!report.coverage.earliestOrder) {
    return (
      <div className="rounded-xl p-8 card-theme border border-theme-primary text-center">
        <TrendingUp className="w-12 h-12 text-theme-accent mx-auto mb-4" aria-hidden />
        <h2 className="text-xl font-semibold text-theme-primary mb-2">No orders yet</h2>
        <p className="text-theme-muted mb-6 max-w-md mx-auto">
          Connect your store, or upload an Amazon order report, and Sails will check your sales against every state&apos;s
          rules — including which states count marketplace sales.
        </p>
        <Link href="/settings#platforms" className="btn-theme-primary px-6 py-3 rounded-lg font-medium inline-block">
          Connect a store
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <NexusResultsView report={report} />
      <RecentAlerts />
    </div>
  );
}

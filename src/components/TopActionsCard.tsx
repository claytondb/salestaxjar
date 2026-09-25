'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import NexusActionList from '@/components/NexusActionList';
import type { TopAction } from '@/lib/nexus-engine';

interface Report {
  coverage: { earliestOrder: string | null };
  topActions: TopAction[];
}

/**
 * Dashboard card: the three most useful things to do next, from the nexus
 * engine. Hidden until the seller has orders (the setup checklist covers that).
 */
export default function TopActionsCard() {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/nexus/exposure')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Report | null) => {
        if (!cancelled) setReport(data);
      })
      .catch(() => {
        // Non-critical: the card simply doesn't show.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!report || !report.coverage.earliestOrder) return null;

  return (
    <section className="card-theme rounded-xl border border-theme-primary p-6 mb-8" aria-labelledby="dashboard-next-steps">
      <div className="flex items-center justify-between mb-4">
        <h2 id="dashboard-next-steps" className="text-lg font-semibold text-theme-primary">
          What to do next
        </h2>
        <Link href="/nexus" className="text-theme-accent text-sm hover:opacity-80">
          See every state →
        </Link>
      </div>
      {report.topActions.length > 0 ? (
        <NexusActionList actions={report.topActions} />
      ) : (
        <p className="text-theme-secondary">
          Nothing needs your attention right now. Sails checks every state each time your orders sync.
        </p>
      )}
    </section>
  );
}

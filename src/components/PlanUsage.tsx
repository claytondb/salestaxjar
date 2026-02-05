'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, AlertTriangle, XCircle } from 'lucide-react';

interface UsageData {
  plan: string;
  planName: string;
  orders: {
    current: number;
    limit: number | null;
    limitDisplay: string;
    remaining: number | null;
    percentUsed: number;
    atLimit: boolean;
    upgradeNeeded: string | null;
  };
  billingPeriod: {
    start: string;
    end: string;
  };
}

export default function PlanUsage() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/usage')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setUsage(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card-theme rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-theme-secondary/30 rounded w-1/3 mb-4"></div>
        <div className="h-3 bg-theme-secondary/30 rounded w-full mb-2"></div>
        <div className="h-8 bg-theme-secondary/30 rounded w-full"></div>
      </div>
    );
  }

  if (!usage) return null;

  // Free plan — show CTA to upgrade
  if (usage.plan === 'free') {
    return (
      <div className="card-theme rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-theme-primary">Plan Usage</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-theme-secondary/30 text-theme-muted">Free Plan</span>
        </div>
        <p className="text-sm text-theme-muted mb-4">
          Connect your store and start importing orders to track your nexus exposure automatically.
        </p>
        <Link
          href="/pricing"
          className="block w-full text-center btn-theme-primary text-white py-2 rounded-lg text-sm font-medium transition"
        >
          Upgrade to Starter — $9/mo
        </Link>
      </div>
    );
  }

  // Unlimited plan (business)
  if (usage.orders.limit === null) {
    return (
      <div className="card-theme rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-theme-primary">Plan Usage</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent-subtle text-theme-accent">{usage.planName}</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl font-bold text-theme-primary">{usage.orders.current.toLocaleString()}</span>
          <span className="text-sm text-theme-muted">orders this month</span>
        </div>
        <p className="text-xs text-theme-accent">Unlimited orders</p>
      </div>
    );
  }

  // Paid plan with limit
  const { current, limit, percentUsed, atLimit, upgradeNeeded } = usage.orders;

  // Determine bar color
  let barColor = 'bg-theme-accent'; // green/teal
  let statusIcon = null;
  let statusText = '';

  if (percentUsed >= 100) {
    barColor = 'bg-red-500';
    statusIcon = <XCircle className="w-4 h-4 text-red-500" />;
    statusText = 'Limit reached';
  } else if (percentUsed >= 90) {
    barColor = 'bg-orange-500';
    statusIcon = <AlertTriangle className="w-4 h-4 text-orange-500" />;
    statusText = 'Almost at limit';
  } else if (percentUsed >= 75) {
    barColor = 'bg-yellow-500';
    statusIcon = <TrendingUp className="w-4 h-4 text-yellow-500" />;
    statusText = 'Getting close';
  }

  const periodEnd = new Date(usage.billingPeriod.end);
  const daysLeft = Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="card-theme rounded-xl p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-theme-primary">Order Usage</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-accent-subtle text-theme-accent">{usage.planName}</span>
      </div>

      {/* Numbers */}
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-bold text-theme-primary">{current.toLocaleString()}</span>
        <span className="text-sm text-theme-muted">/ {limit!.toLocaleString()} orders</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-3 bg-theme-secondary/30 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>

      {/* Status line */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {statusIcon}
          {statusText ? (
            <span className="text-xs text-theme-muted">{statusText} — {percentUsed}% used</span>
          ) : (
            <span className="text-xs text-theme-muted">{percentUsed}% used</span>
          )}
        </div>
        <span className="text-xs text-theme-muted">{daysLeft} days left</span>
      </div>

      {/* Upgrade prompt */}
      {(atLimit || percentUsed >= 80) && upgradeNeeded && (
        <Link
          href="/pricing"
          className={`block w-full text-center mt-4 py-2 rounded-lg text-sm font-medium transition ${
            atLimit
              ? 'btn-theme-primary text-white'
              : 'border border-theme-accent text-theme-accent hover:bg-accent-subtle'
          }`}
        >
          {atLimit
            ? `Upgrade to ${upgradeNeeded.charAt(0).toUpperCase() + upgradeNeeded.slice(1)}`
            : `Need more? Upgrade to ${upgradeNeeded.charAt(0).toUpperCase() + upgradeNeeded.slice(1)}`
          }
        </Link>
      )}
    </div>
  );
}

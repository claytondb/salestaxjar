'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, TrendingUp, ShieldAlert, ShieldCheck, Info, Bell, ExternalLink } from 'lucide-react';

interface StateExposure {
  stateCode: string;
  stateName: string;
  hasSalesTax: boolean;
  currentSales: number;
  currentTransactions: number;
  salesThreshold: number | null;
  transactionThreshold: number | null;
  salesPercentage: number;
  transactionPercentage: number;
  highestPercentage: number;
  status: 'safe' | 'approaching' | 'warning' | 'exceeded';
  measurementPeriod: string;
  notes: string;
}

interface ExposureSummary {
  totalStatesWithSales: number;
  exceededCount: number;
  warningCount: number;
  approachingCount: number;
  safeCount: number;
  noSalesTaxCount: number;
}

interface NexusAlert {
  id: string;
  stateCode: string;
  stateName: string;
  alertLevel: string;
  salesAmount: number;
  threshold: number;
  percentage: number;
  message: string;
  read: boolean;
  createdAt: string;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

function formatFullCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'exceeded':
      return 'text-red-400';
    case 'warning':
      return 'text-orange-400';
    case 'approaching':
      return 'text-yellow-400';
    default:
      return 'text-emerald-400';
  }
}

function getStatusBgColor(status: string): string {
  switch (status) {
    case 'exceeded':
      return 'bg-red-500';
    case 'warning':
      return 'bg-orange-500';
    case 'approaching':
      return 'bg-yellow-500';
    default:
      return 'bg-emerald-500';
  }
}

function getStatusBarBg(status: string): string {
  switch (status) {
    case 'exceeded':
      return 'bg-red-500/20';
    case 'warning':
      return 'bg-orange-500/20';
    case 'approaching':
      return 'bg-yellow-500/20';
    default:
      return 'bg-emerald-500/20';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'exceeded':
      return 'Exceeded';
    case 'warning':
      return 'Warning';
    case 'approaching':
      return 'Approaching';
    default:
      return 'Safe';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'exceeded':
      return <ShieldAlert className="w-5 h-5 text-red-400" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-orange-400" />;
    case 'approaching':
      return <TrendingUp className="w-5 h-5 text-yellow-400" />;
    default:
      return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
  }
}

export default function NexusExposure() {
  const [exposures, setExposures] = useState<StateExposure[]>([]);
  const [summary, setSummary] = useState<ExposureSummary | null>(null);
  const [alerts, setAlerts] = useState<NexusAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'attention' | 'safe'>('all');
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    fetchExposureData();
    fetchAlerts();
  }, []);

  const fetchExposureData = async () => {
    try {
      const response = await fetch('/api/nexus/exposure');
      if (!response.ok) throw new Error('Failed to fetch exposure data');
      const data = await response.json();
      setExposures(data.exposures);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/nexus/alerts?unreadOnly=false&limit=20');
      if (!response.ok) return;
      const data = await response.json();
      setAlerts(data.alerts);
      setUnreadCount(data.unreadCount);
    } catch {
      // Non-critical
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/nexus/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      setAlerts(prev => prev.map(a => ({ ...a, read: true })));
      setUnreadCount(0);
    } catch {
      // Non-critical
    }
  };

  const filteredExposures = exposures.filter(e => {
    if (filter === 'attention') {
      return e.status !== 'safe' && e.hasSalesTax;
    }
    if (filter === 'safe') {
      return e.status === 'safe' && e.hasSalesTax && e.currentSales > 0;
    }
    return e.hasSalesTax;
  });

  const noSalesTaxStates = exposures.filter(e => !e.hasSalesTax);
  const hasData = exposures.some(e => e.currentSales > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-theme-accent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl p-6 card-theme border border-red-500/30">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="rounded-xl p-8 card-theme border border-theme-primary text-center">
        <TrendingUp className="w-12 h-12 text-theme-accent mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-theme-primary mb-2">
          No Sales Data Yet
        </h3>
        <p className="text-theme-muted mb-6 max-w-md mx-auto">
          Connect a sales platform and sync your orders to see your nexus exposure 
          across all states automatically.
        </p>
        <a
          href="/settings#platforms"
          className="btn-theme-primary px-6 py-3 rounded-lg font-medium inline-block"
        >
          Connect a Platform
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Banner for Exceeded States */}
      {summary && summary.exceededCount > 0 && (
        <div className="rounded-xl p-5 border border-red-500/40 bg-red-500/10">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-400 text-lg">
                Action Required — {summary.exceededCount} State{summary.exceededCount > 1 ? 's' : ''} Exceeded
              </h3>
              <p className="text-red-300/80 text-sm mt-1">
                You&apos;ve crossed the economic nexus threshold in {summary.exceededCount} state{summary.exceededCount > 1 ? 's' : ''}. 
                You need to register and begin collecting sales tax.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card-theme rounded-xl p-4 border border-red-500/30">
            <div className="text-2xl font-bold text-red-400">{summary.exceededCount}</div>
            <div className="text-sm text-theme-muted">Exceeded</div>
          </div>
          <div className="card-theme rounded-xl p-4 border border-orange-500/30">
            <div className="text-2xl font-bold text-orange-400">{summary.warningCount}</div>
            <div className="text-sm text-theme-muted">Warning (90%+)</div>
          </div>
          <div className="card-theme rounded-xl p-4 border border-yellow-500/30">
            <div className="text-2xl font-bold text-yellow-400">{summary.approachingCount}</div>
            <div className="text-sm text-theme-muted">Approaching (75%+)</div>
          </div>
          <div className="card-theme rounded-xl p-4 border border-emerald-500/30">
            <div className="text-2xl font-bold text-emerald-400">{summary.totalStatesWithSales}</div>
            <div className="text-sm text-theme-muted">States with Sales</div>
          </div>
        </div>
      )}

      {/* Filter + Alert Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'all'
                ? 'btn-theme-primary text-white'
                : 'bg-white/10 text-theme-secondary hover:bg-white/20'
            }`}
          >
            All States
          </button>
          <button
            onClick={() => setFilter('attention')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'attention'
                ? 'btn-theme-primary text-white'
                : 'bg-white/10 text-theme-secondary hover:bg-white/20'
            }`}
          >
            Needs Attention
          </button>
          <button
            onClick={() => setFilter('safe')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'safe'
                ? 'btn-theme-primary text-white'
                : 'bg-white/10 text-theme-secondary hover:bg-white/20'
            }`}
          >
            Safe
          </button>
        </div>

        {alerts.length > 0 && (
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className="relative flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-theme-secondary hover:bg-white/20 transition text-sm"
          >
            <Bell className="w-4 h-4" />
            <span>Alerts</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Alerts Panel */}
      {showAlerts && alerts.length > 0 && (
        <div className="card-theme rounded-xl border border-theme-primary overflow-hidden">
          <div className="p-4 border-b border-theme-primary flex items-center justify-between">
            <h3 className="font-semibold text-theme-primary">Recent Alerts</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-theme-accent text-sm hover:opacity-80"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`p-4 ${!alert.read ? 'bg-white/5' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {alert.alertLevel === 'exceeded' && <ShieldAlert className="w-4 h-4 text-red-400" />}
                    {alert.alertLevel === 'warning' && <AlertTriangle className="w-4 h-4 text-orange-400" />}
                    {alert.alertLevel === 'approaching' && <TrendingUp className="w-4 h-4 text-yellow-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-theme-primary">{alert.message}</p>
                    <p className="text-xs text-theme-muted mt-1">
                      {new Date(alert.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* State Exposure List */}
      <div className="card-theme rounded-xl border border-theme-primary overflow-hidden">
        <div className="divide-y divide-white/5">
          {filteredExposures.map(exposure => (
            <div
              key={exposure.stateCode}
              className={`p-5 ${
                exposure.status === 'exceeded' ? 'bg-red-500/5' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(exposure.status)}
                  <div>
                    <h4 className="font-medium text-theme-primary">
                      {exposure.stateName}
                      <span className="text-theme-muted ml-2 text-sm">{exposure.stateCode}</span>
                    </h4>
                    <p className="text-xs text-theme-muted mt-0.5">
                      {exposure.measurementPeriod === 'rolling_12_months'
                        ? 'Rolling 12 months'
                        : 'Calendar year'}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    exposure.status === 'exceeded'
                      ? 'bg-red-500/20 text-red-400'
                      : exposure.status === 'warning'
                      ? 'bg-orange-500/20 text-orange-400'
                      : exposure.status === 'approaching'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {getStatusLabel(exposure.status)}
                </span>
              </div>

              {/* Sales Progress Bar */}
              {exposure.salesThreshold && (
                <div className="mb-2">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-theme-muted">Sales</span>
                    <span className={`font-medium ${getStatusColor(exposure.status)}`}>
                      {formatFullCurrency(exposure.currentSales)} / {formatFullCurrency(exposure.salesThreshold)}
                      {' '}
                      <span className="text-theme-muted">
                        ({Math.min(Math.round(exposure.salesPercentage), 999)}%)
                      </span>
                    </span>
                  </div>
                  <div className={`h-2.5 rounded-full ${getStatusBarBg(exposure.status)} overflow-hidden`}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getStatusBgColor(exposure.status)}`}
                      style={{
                        width: `${Math.min(exposure.salesPercentage, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Transaction Progress Bar (only show if there's a threshold and it's relevant) */}
              {exposure.transactionThreshold &&
                exposure.transactionPercentage > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-theme-muted">Transactions</span>
                      <span className="text-theme-secondary font-medium">
                        {exposure.currentTransactions.toLocaleString()} / {exposure.transactionThreshold.toLocaleString()}
                        {' '}
                        <span className="text-theme-muted">
                          ({Math.min(Math.round(exposure.transactionPercentage), 999)}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          exposure.transactionPercentage >= 100
                            ? 'bg-red-500'
                            : exposure.transactionPercentage >= 90
                            ? 'bg-orange-500'
                            : exposure.transactionPercentage >= 75
                            ? 'bg-yellow-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${Math.min(exposure.transactionPercentage, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

              {/* Action Items for Exceeded States */}
              {exposure.status === 'exceeded' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-sm">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Register in {exposure.stateName}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-sm">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Start collecting tax
                  </span>
                </div>
              )}
            </div>
          ))}

          {filteredExposures.length === 0 && (
            <div className="p-8 text-center text-theme-muted">
              <Info className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>No states match this filter.</p>
            </div>
          )}
        </div>
      </div>

      {/* No Sales Tax States (collapsed section) */}
      {filter === 'all' && noSalesTaxStates.length > 0 && (
        <div className="card-theme rounded-xl border border-theme-primary overflow-hidden opacity-60">
          <div className="p-4">
            <h3 className="text-sm font-medium text-theme-muted mb-3">
              States With No Sales Tax
            </h3>
            <div className="flex flex-wrap gap-2">
              {noSalesTaxStates.map(state => (
                <span
                  key={state.stateCode}
                  className="px-3 py-1 rounded-lg bg-white/5 text-theme-muted text-sm"
                >
                  {state.stateCode}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

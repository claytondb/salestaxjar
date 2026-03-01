'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp,
  MapPin,
  DollarSign,
  Package,
  ChevronDown,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface StateReport {
  stateCode: string;
  stateName: string;
  hasNexus: boolean;
  orderCount: number;
  subtotal: number;
  shipping: number;
  taxCollected: number;
  totalSales: number;
  platforms: Array<{ platform: string; orders: number; sales: number }>;
}

interface ReportData {
  range: {
    type: string;
    startDate: string;
    endDate: string;
  };
  states: StateReport[];
  totals: {
    orderCount: number;
    subtotal: number;
    shipping: number;
    taxCollected: number;
    totalSales: number;
  };
  statesWithNexus: number;
  statesWithSales: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function ReportsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rangeType, setRangeType] = useState<'rolling12' | 'calendarYear' | 'custom'>('rolling12');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchReport();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, rangeType, customStartDate, customEndDate]);

  const fetchReport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let url = `/api/reports/sales-by-state?range=${rangeType}`;
      if (rangeType === 'custom' && customStartDate && customEndDate) {
        url += `&startDate=${customStartDate}&endDate=${customEndDate}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch report');
      }

      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (type: 'summary' | 'detailed') => {
    setIsExporting(true);
    try {
      let url = `/api/reports/export?type=${type}&range=${rangeType}`;
      if (rangeType === 'custom' && customStartDate && customEndDate) {
        url += `&startDate=${customStartDate}&endDate=${customEndDate}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'sails-export.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (err) {
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const toggleStateExpanded = (stateCode: string) => {
    setExpandedStates(prev => {
      const next = new Set(prev);
      if (next.has(stateCode)) {
        next.delete(stateCode);
      } else {
        next.add(stateCode);
      }
      return next;
    });
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-theme-gradient flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-theme-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-gradient">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link 
          href="/dashboard" 
          className="inline-flex items-center text-theme-muted hover:text-theme-primary mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-theme-primary flex items-center gap-3">
              <FileText className="w-8 h-8 text-theme-accent" />
              Sales Reports
            </h1>
            <p className="text-theme-muted mt-2">
              Analyze your sales by state and export data for tax filing
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="card-theme rounded-xl p-6 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">
                Date Range
              </label>
              <select
                value={rangeType}
                onChange={(e) => setRangeType(e.target.value as typeof rangeType)}
                className="px-4 py-2 rounded-lg bg-theme-input border border-theme-subtle text-theme-primary focus:outline-none focus:ring-2 focus:ring-theme-accent"
              >
                <option value="rolling12">Rolling 12 Months</option>
                <option value="calendarYear">Calendar Year {new Date().getFullYear()}</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {rangeType === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-theme-input border border-theme-subtle text-theme-primary focus:outline-none focus:ring-2 focus:ring-theme-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-theme-input border border-theme-subtle text-theme-primary focus:outline-none focus:ring-2 focus:ring-theme-accent"
                  />
                </div>
              </>
            )}

            <div className="flex-grow" />

            {/* Export Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('summary')}
                disabled={isExporting || isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-accent text-white hover:bg-theme-accent-hover disabled:opacity-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Summary
              </button>
              <button
                onClick={() => handleExport('detailed')}
                disabled={isExporting || isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-theme-accent text-theme-accent hover:bg-theme-accent hover:text-white disabled:opacity-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Orders
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="card-theme rounded-xl p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-theme-accent mb-4" />
            <p className="text-theme-muted">Loading report data...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="card-theme rounded-xl p-12 flex flex-col items-center justify-center text-red-500">
            <AlertTriangle className="w-8 h-8 mb-4" />
            <p>{error}</p>
            <button
              onClick={fetchReport}
              className="mt-4 px-4 py-2 rounded-lg bg-theme-accent text-white hover:bg-theme-accent-hover"
            >
              Retry
            </button>
          </div>
        )}

        {/* Report Content */}
        {reportData && !isLoading && !error && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="card-theme rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Package className="w-5 h-5 text-theme-accent" />
                  <span className="text-sm text-theme-muted">Total Orders</span>
                </div>
                <p className="text-2xl font-bold text-theme-primary">
                  {reportData.totals.orderCount.toLocaleString()}
                </p>
              </div>

              <div className="card-theme rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-theme-accent" />
                  <span className="text-sm text-theme-muted">Total Sales</span>
                </div>
                <p className="text-2xl font-bold text-theme-primary">
                  {formatCurrency(reportData.totals.totalSales)}
                </p>
              </div>

              <div className="card-theme rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-theme-muted">Tax Collected</span>
                </div>
                <p className="text-2xl font-bold text-green-500">
                  {formatCurrency(reportData.totals.taxCollected)}
                </p>
              </div>

              <div className="card-theme rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <MapPin className="w-5 h-5 text-theme-accent" />
                  <span className="text-sm text-theme-muted">States with Sales</span>
                </div>
                <p className="text-2xl font-bold text-theme-primary">
                  {reportData.statesWithSales}
                </p>
              </div>
            </div>

            {/* Date Range Info */}
            <div className="text-sm text-theme-muted mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {formatDate(reportData.range.startDate)} — {formatDate(reportData.range.endDate)}
              </span>
            </div>

            {/* States Table */}
            {reportData.states.length > 0 ? (
              <div className="card-theme rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-theme-subtle">
                        <th className="text-left px-4 py-3 text-sm font-semibold text-theme-secondary">State</th>
                        <th className="text-right px-4 py-3 text-sm font-semibold text-theme-secondary">Orders</th>
                        <th className="text-right px-4 py-3 text-sm font-semibold text-theme-secondary">Subtotal</th>
                        <th className="text-right px-4 py-3 text-sm font-semibold text-theme-secondary">Shipping</th>
                        <th className="text-right px-4 py-3 text-sm font-semibold text-theme-secondary">Tax</th>
                        <th className="text-right px-4 py-3 text-sm font-semibold text-theme-secondary">Total</th>
                        <th className="text-center px-4 py-3 text-sm font-semibold text-theme-secondary">Nexus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.states.map((state, index) => (
                        <>
                          <tr 
                            key={state.stateCode}
                            className={`border-t border-theme-subtle hover:bg-theme-subtle/50 cursor-pointer ${
                              index % 2 === 0 ? '' : 'bg-theme-subtle/25'
                            }`}
                            onClick={() => toggleStateExpanded(state.stateCode)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <ChevronDown 
                                  className={`w-4 h-4 text-theme-muted transition-transform ${
                                    expandedStates.has(state.stateCode) ? 'rotate-180' : ''
                                  }`} 
                                />
                                <span className="font-medium text-theme-primary">{state.stateName}</span>
                                <span className="text-theme-muted">({state.stateCode})</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-theme-secondary">
                              {state.orderCount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-theme-secondary">
                              {formatCurrency(state.subtotal)}
                            </td>
                            <td className="px-4 py-3 text-right text-theme-secondary">
                              {formatCurrency(state.shipping)}
                            </td>
                            <td className="px-4 py-3 text-right text-green-600 font-medium">
                              {formatCurrency(state.taxCollected)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-theme-primary">
                              {formatCurrency(state.totalSales)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {state.hasNexus ? (
                                <CheckCircle className="w-5 h-5 text-green-500 inline-block" />
                              ) : (
                                <span className="text-theme-muted">—</span>
                              )}
                            </td>
                          </tr>
                          {/* Platform breakdown (expanded) */}
                          {expandedStates.has(state.stateCode) && state.platforms.length > 0 && (
                            <tr className="bg-theme-subtle/50">
                              <td colSpan={7} className="px-8 py-3">
                                <div className="text-sm">
                                  <span className="text-theme-muted font-medium mb-2 block">Platform Breakdown:</span>
                                  <div className="flex flex-wrap gap-4">
                                    {state.platforms.map(p => (
                                      <div key={p.platform} className="flex items-center gap-2 text-theme-secondary">
                                        <span className="font-medium capitalize">{p.platform}:</span>
                                        <span>{p.orders} orders</span>
                                        <span className="text-theme-muted">•</span>
                                        <span>{formatCurrency(p.sales)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-theme-accent/10 border-t-2 border-theme-accent">
                        <td className="px-4 py-3 font-bold text-theme-primary">TOTALS</td>
                        <td className="px-4 py-3 text-right font-bold text-theme-primary">
                          {reportData.totals.orderCount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-theme-primary">
                          {formatCurrency(reportData.totals.subtotal)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-theme-primary">
                          {formatCurrency(reportData.totals.shipping)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">
                          {formatCurrency(reportData.totals.taxCollected)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-theme-primary">
                          {formatCurrency(reportData.totals.totalSales)}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-theme-primary">
                          {reportData.statesWithNexus}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              <div className="card-theme rounded-xl p-12 text-center">
                <Package className="w-12 h-12 text-theme-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-theme-primary mb-2">No Sales Data</h3>
                <p className="text-theme-muted mb-4">
                  Connect a platform and sync orders to see your sales report.
                </p>
                <Link 
                  href="/dashboard/integrations" 
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-accent text-white hover:bg-theme-accent-hover"
                >
                  Connect Platform
                </Link>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

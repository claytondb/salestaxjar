'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';

export default function FilingsPage() {
  const { user, filingDeadlines, nexusStates, updateFilingDeadline, isLoading } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'pending' | 'filed' | 'overdue'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const filteredDeadlines = filingDeadlines.filter(d => {
    if (filter === 'all') return true;
    return d.status === filter;
  });

  const pendingCount = filingDeadlines.filter(d => d.status === 'pending').length;
  const filedCount = filingDeadlines.filter(d => d.status === 'filed').length;
  const overdueCount = filingDeadlines.filter(d => d.status === 'overdue').length;

  // Group deadlines by month for calendar view
  const groupedByMonth: Record<string, typeof filingDeadlines> = {};
  filteredDeadlines.forEach(d => {
    const date = new Date(d.dueDate);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!groupedByMonth[key]) groupedByMonth[key] = [];
    groupedByMonth[key].push(d);
  });

  const hasNexus = nexusStates.some(s => s.hasNexus);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Filing Calendar</h1>
          <p className="text-gray-400">Track and manage your sales tax filing deadlines</p>
        </div>

        {!hasNexus ? (
          <div className="bg-white/10 backdrop-blur rounded-xl p-12 border border-white/20 text-center">
            <span className="text-5xl mb-4 block">📅</span>
            <h2 className="text-xl font-semibold text-white mb-2">No Filing Deadlines Yet</h2>
            <p className="text-gray-400 mb-6">
              Configure your nexus states to see upcoming filing deadlines
            </p>
            <Link 
              href="/nexus"
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium transition inline-block"
            >
              Configure Nexus States
            </Link>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <button
                onClick={() => setFilter('pending')}
                className={`bg-white/10 backdrop-blur rounded-xl p-4 border text-left transition ${
                  filter === 'pending' ? 'border-amber-500/50' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="text-2xl font-bold text-amber-400">{pendingCount}</div>
                <div className="text-sm text-gray-400">Pending Filings</div>
              </button>
              <button
                onClick={() => setFilter('filed')}
                className={`bg-white/10 backdrop-blur rounded-xl p-4 border text-left transition ${
                  filter === 'filed' ? 'border-emerald-500/50' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="text-2xl font-bold text-emerald-400">{filedCount}</div>
                <div className="text-sm text-gray-400">Filed</div>
              </button>
              <button
                onClick={() => setFilter('overdue')}
                className={`bg-white/10 backdrop-blur rounded-xl p-4 border text-left transition ${
                  filter === 'overdue' ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="text-2xl font-bold text-red-400">{overdueCount}</div>
                <div className="text-sm text-gray-400">Overdue</div>
              </button>
            </div>

            {/* View Controls */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filter === 'all' 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('pending')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filter === 'pending' 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setFilter('filed')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filter === 'filed' 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  Filed
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    viewMode === 'list' 
                      ? 'bg-white/20 text-white' 
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  📋 List
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    viewMode === 'calendar' 
                      ? 'bg-white/20 text-white' 
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  📅 Calendar
                </button>
              </div>
            </div>

            {viewMode === 'list' ? (
              <div className="bg-white/10 backdrop-blur rounded-xl border border-white/10 overflow-hidden">
                {filteredDeadlines.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-gray-400">No deadlines match this filter</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/10">
                    {filteredDeadlines.map((deadline) => {
                      const dueDate = new Date(deadline.dueDate);
                      const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const isUrgent = daysUntil <= 7 && daysUntil > 0;
                      const isPast = daysUntil < 0;
                      
                      return (
                        <div key={deadline.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                              deadline.status === 'filed' ? 'bg-emerald-500/20' :
                              deadline.status === 'overdue' ? 'bg-red-500/20' :
                              isUrgent ? 'bg-amber-500/20' : 'bg-white/10'
                            }`}>
                              {deadline.status === 'filed' ? '✅' :
                               deadline.status === 'overdue' ? '⚠️' : '📋'}
                            </div>
                            <div>
                              <h3 className="font-medium text-white">{deadline.state}</h3>
                              <p className="text-gray-400 text-sm">
                                {deadline.period.charAt(0).toUpperCase() + deadline.period.slice(1)} filing
                              </p>
                              {deadline.estimatedTax && (
                                <p className="text-emerald-400 text-sm mt-1">
                                  Estimated: ${deadline.estimatedTax.toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className={`font-medium ${
                                deadline.status === 'filed' ? 'text-emerald-400' :
                                deadline.status === 'overdue' || isPast ? 'text-red-400' :
                                isUrgent ? 'text-amber-400' : 'text-white'
                              }`}>
                                {dueDate.toLocaleDateString('en-US', { 
                                  weekday: 'short',
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </div>
                              <div className={`text-sm ${
                                deadline.status === 'filed' ? 'text-emerald-400/70' :
                                isPast ? 'text-red-400' :
                                isUrgent ? 'text-amber-400/70' : 'text-gray-500'
                              }`}>
                                {deadline.status === 'filed' ? 'Filed' :
                                 isPast ? `${Math.abs(daysUntil)} days overdue` :
                                 `${daysUntil} days left`}
                              </div>
                            </div>

                            {deadline.status !== 'filed' && (
                              <button
                                onClick={() => updateFilingDeadline(deadline.id, 'filed')}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                              >
                                Mark Filed
                              </button>
                            )}
                            {deadline.status === 'filed' && (
                              <button
                                onClick={() => updateFilingDeadline(deadline.id, 'pending')}
                                className="bg-white/10 hover:bg-white/20 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition"
                              >
                                Undo
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              // Calendar View
              <div className="space-y-6">
                {Object.entries(groupedByMonth).sort().map(([month, deadlines]) => {
                  const [year, m] = month.split('-');
                  const monthName = new Date(parseInt(year), parseInt(m) - 1).toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                  });

                  return (
                    <div key={month} className="bg-white/10 backdrop-blur rounded-xl border border-white/10 overflow-hidden">
                      <div className="p-4 border-b border-white/10 bg-white/5">
                        <h3 className="text-lg font-semibold text-white">{monthName}</h3>
                      </div>
                      <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {deadlines.map((deadline) => {
                          const dueDate = new Date(deadline.dueDate);
                          
                          return (
                            <div 
                              key={deadline.id}
                              className={`p-4 rounded-lg border ${
                                deadline.status === 'filed' 
                                  ? 'bg-emerald-500/10 border-emerald-500/30' 
                                  : 'bg-white/5 border-white/10'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-white">{deadline.state}</span>
                                <span className={`text-sm ${
                                  deadline.status === 'filed' ? 'text-emerald-400' : 'text-gray-400'
                                }`}>
                                  {dueDate.getDate()}
                                </span>
                              </div>
                              <div className="text-sm text-gray-400 mb-3">
                                {deadline.period.charAt(0).toUpperCase() + deadline.period.slice(1)}
                              </div>
                              {deadline.status !== 'filed' ? (
                                <button
                                  onClick={() => updateFilingDeadline(deadline.id, 'filed')}
                                  className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 py-1.5 rounded text-sm transition"
                                >
                                  Mark Filed
                                </button>
                              ) : (
                                <div className="text-center text-emerald-400 text-sm">✓ Filed</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

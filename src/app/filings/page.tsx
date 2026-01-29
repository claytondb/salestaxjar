'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import { Calendar, ClipboardList, CheckCircle2, AlertTriangle, Check, List } from 'lucide-react';

export default function FilingsPage() {
  const { user, filingDeadlines, nexusStates, updateFilingDeadline, isLoading } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'pending' | 'filed' | 'overdue'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  
  // Use state for current time to avoid calling Date.now() during render
  // Initialize with a function to avoid the impure call during render
  const [currentTime] = useState<number>(() => Date.now());

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
      <div className="min-h-screen bg-theme-gradient flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-theme-accent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-gradient">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-theme-primary mb-2">Filing Calendar</h1>
          <p className="text-theme-muted">Track and manage your sales tax filing deadlines</p>
        </div>

        {!hasNexus ? (
          <div className="card-theme rounded-xl p-12 border border-white/20 text-center">
            <Calendar className="w-12 h-12 text-theme-accent mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-theme-primary mb-2">No Filing Deadlines Yet</h2>
            <p className="text-theme-muted mb-6">
              Configure your nexus states to see upcoming filing deadlines
            </p>
            <Link 
              href="/nexus"
              className="btn-theme-primary  text-theme-primary px-6 py-3 rounded-lg font-medium transition inline-block"
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
                className={`card-theme rounded-xl p-4 border text-left transition ${
                  filter === 'pending' ? 'border-amber-500/50' : 'border-theme-primary hover:border-white/20'
                }`}
              >
                <div className="text-2xl font-bold text-amber-400">{pendingCount}</div>
                <div className="text-sm text-theme-muted">Pending Filings</div>
              </button>
              <button
                onClick={() => setFilter('filed')}
                className={`card-theme rounded-xl p-4 border text-left transition ${
                  filter === 'filed' ? 'border-theme-accent/50' : 'border-theme-primary hover:border-white/20'
                }`}
              >
                <div className="text-2xl font-bold text-theme-accent">{filedCount}</div>
                <div className="text-sm text-theme-muted">Filed</div>
              </button>
              <button
                onClick={() => setFilter('overdue')}
                className={`card-theme rounded-xl p-4 border text-left transition ${
                  filter === 'overdue' ? 'border-theme-primary' : 'border-theme-primary hover:border-white/20'
                }`}
                style={filter === 'overdue' ? { borderColor: 'var(--error-border)' } : {}}
              >
                <div className="text-2xl font-bold" style={{ color: 'var(--error-text)' }}>{overdueCount}</div>
                <div className="text-sm text-theme-muted">Overdue</div>
              </button>
            </div>

            {/* View Controls */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filter === 'all' 
                      ? 'btn-theme-primary text-theme-primary' 
                      : 'bg-white/10 text-theme-secondary hover:bg-white/20'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('pending')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filter === 'pending' 
                      ? 'btn-theme-primary text-theme-primary' 
                      : 'bg-white/10 text-theme-secondary hover:bg-white/20'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setFilter('filed')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filter === 'filed' 
                      ? 'btn-theme-primary text-theme-primary' 
                      : 'bg-white/10 text-theme-secondary hover:bg-white/20'
                  }`}
                >
                  Filed
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                    viewMode === 'list' 
                      ? 'bg-white/20 text-theme-primary' 
                      : 'bg-white/10 text-theme-secondary hover:bg-white/20'
                  }`}
                >
                  <List className="w-4 h-4" /> List
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                    viewMode === 'calendar' 
                      ? 'bg-white/20 text-theme-primary' 
                      : 'bg-white/10 text-theme-secondary hover:bg-white/20'
                  }`}
                >
                  <Calendar className="w-4 h-4" /> Calendar
                </button>
              </div>
            </div>

            {viewMode === 'list' ? (
              <div className="card-theme rounded-xl border border-theme-primary overflow-hidden">
                {filteredDeadlines.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-theme-muted">No deadlines match this filter</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/10">
                    {filteredDeadlines.map((deadline) => {
                      const dueDate = new Date(deadline.dueDate);
                      const daysUntil = Math.ceil((dueDate.getTime() - currentTime) / (1000 * 60 * 60 * 24));
                      const isUrgent = daysUntil <= 7 && daysUntil > 0;
                      const isPast = daysUntil < 0;
                      
                      return (
                        <div key={deadline.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div 
                              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                deadline.status === 'filed' ? 'btn-theme-primary/20' :
                                isUrgent && deadline.status !== 'overdue' ? 'bg-amber-500/20' : 'bg-white/10'
                              }`}
                              style={deadline.status === 'overdue' ? { backgroundColor: 'var(--error-bg)' } : {}}
                            >
                              {deadline.status === 'filed' ? <CheckCircle2 className="w-6 h-6 text-theme-accent" /> :
                               deadline.status === 'overdue' ? <AlertTriangle className="w-6 h-6" style={{ color: 'var(--error-text)' }} /> : 
                               <ClipboardList className="w-6 h-6 text-theme-accent" />}
                            </div>
                            <div>
                              <h3 className="font-medium text-theme-primary">{deadline.state}</h3>
                              <p className="text-theme-muted text-sm">
                                {deadline.period.charAt(0).toUpperCase() + deadline.period.slice(1)} filing
                              </p>
                              {deadline.estimatedTax && (
                                <p className="text-theme-accent text-sm mt-1">
                                  Estimated: ${deadline.estimatedTax.toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div 
                                className={`font-medium ${
                                  deadline.status === 'filed' ? 'text-theme-accent' :
                                  (!isPast && !deadline.status.includes('overdue') && isUrgent) ? 'text-amber-600' : 
                                  (!isPast && !deadline.status.includes('overdue')) ? 'text-theme-primary' : ''
                                }`}
                                style={(deadline.status === 'overdue' || isPast) ? { color: 'var(--error-text)' } : {}}
                              >
                                {dueDate.toLocaleDateString('en-US', { 
                                  weekday: 'short',
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </div>
                              <div 
                                className={`text-sm ${
                                  deadline.status === 'filed' ? 'text-theme-accent/70' :
                                  (!isPast && isUrgent) ? 'text-amber-600' : 
                                  !isPast ? 'text-theme-muted' : ''
                                }`}
                                style={isPast ? { color: 'var(--error-text)' } : {}}
                              >
                                {deadline.status === 'filed' ? 'Filed' :
                                 isPast ? `${Math.abs(daysUntil)} days overdue` :
                                 `${daysUntil} days left`}
                              </div>
                            </div>

                            {deadline.status !== 'filed' && (
                              <button
                                onClick={() => updateFilingDeadline(deadline.id, 'filed')}
                                className="btn-theme-primary  text-theme-primary px-4 py-2 rounded-lg text-sm font-medium transition"
                              >
                                Mark Filed
                              </button>
                            )}
                            {deadline.status === 'filed' && (
                              <button
                                onClick={() => updateFilingDeadline(deadline.id, 'pending')}
                                className="bg-white/10 hover:bg-white/20 text-theme-secondary px-4 py-2 rounded-lg text-sm font-medium transition"
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
                    <div key={month} className="card-theme rounded-xl border border-theme-primary overflow-hidden">
                      <div className="p-4 border-b border-theme-primary bg-white/5">
                        <h3 className="text-lg font-semibold text-theme-primary">{monthName}</h3>
                      </div>
                      <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {deadlines.map((deadline) => {
                          const dueDate = new Date(deadline.dueDate);
                          
                          return (
                            <div 
                              key={deadline.id}
                              className={`p-4 rounded-lg border ${
                                deadline.status === 'filed' 
                                  ? 'btn-theme-primary/10 border-theme-accent/30' 
                                  : 'bg-white/5 border-theme-primary'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-theme-primary">{deadline.state}</span>
                                <span className={`text-sm ${
                                  deadline.status === 'filed' ? 'text-theme-accent' : 'text-theme-muted'
                                }`}>
                                  {dueDate.getDate()}
                                </span>
                              </div>
                              <div className="text-sm text-theme-muted mb-3">
                                {deadline.period.charAt(0).toUpperCase() + deadline.period.slice(1)}
                              </div>
                              {deadline.status !== 'filed' ? (
                                <button
                                  onClick={() => updateFilingDeadline(deadline.id, 'filed')}
                                  className="w-full btn-theme-primary/20 hover:btn-theme-primary/30 text-theme-accent py-1.5 rounded text-sm transition"
                                >
                                  Mark Filed
                                </button>
                              ) : (
                                <div className="text-center text-theme-accent text-sm flex items-center justify-center gap-1">
                                  <Check className="w-4 h-4" /> Filed
                                </div>
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

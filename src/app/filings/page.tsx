'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { FilingDeadline } from '@/types';
import { Calendar, ClipboardList, CheckCircle2, AlertTriangle, Check, List, Wand2, RefreshCw, X, DollarSign, Hash, FileText } from 'lucide-react';

interface FilingModalProps {
  deadline: FilingDeadline;
  onClose: () => void;
  onConfirm: (id: string, extras: { actualTax?: number; confirmationNumber?: string; notes?: string }) => Promise<void>;
}

function MarkFiledModal({ deadline, onClose, onConfirm }: FilingModalProps) {
  const [actualTax, setActualTax] = useState(deadline.estimatedTax?.toString() ?? '');
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onConfirm(deadline.id, {
      actualTax: actualTax ? parseFloat(actualTax) : undefined,
      confirmationNumber: confirmationNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card-theme rounded-2xl border border-white/20 shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-theme-primary">Mark as Filed</h2>
            <p className="text-sm text-theme-muted mt-0.5">
              {deadline.state} — {deadline.period.charAt(0).toUpperCase() + deadline.period.slice(1)} filing
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5 text-theme-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Actual Tax Amount */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">
              <DollarSign className="w-4 h-4 inline mr-1.5 opacity-70" />
              Actual Tax Paid
              <span className="text-theme-muted font-normal ml-1">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={actualTax}
                onChange={e => setActualTax(e.target.value)}
                placeholder={deadline.estimatedTax ? `${deadline.estimatedTax.toFixed(2)} (estimated)` : '0.00'}
                className="w-full bg-white/10 border border-white/20 rounded-lg pl-8 pr-4 py-2.5 text-theme-primary placeholder:text-theme-muted focus:outline-none focus:border-theme-accent/50 transition"
              />
            </div>
            {deadline.estimatedTax && parseFloat(actualTax || '0') !== deadline.estimatedTax && actualTax && (
              <p className="text-xs text-theme-muted mt-1.5">
                Estimated was ${deadline.estimatedTax.toFixed(2)} — difference: ${(parseFloat(actualTax) - deadline.estimatedTax).toFixed(2)}
              </p>
            )}
          </div>

          {/* Confirmation Number */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">
              <Hash className="w-4 h-4 inline mr-1.5 opacity-70" />
              Confirmation Number
              <span className="text-theme-muted font-normal ml-1">(optional)</span>
            </label>
            <input
              type="text"
              value={confirmationNumber}
              onChange={e => setConfirmationNumber(e.target.value)}
              placeholder="e.g. ST-2026-Q1-00123"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-theme-primary placeholder:text-theme-muted focus:outline-none focus:border-theme-accent/50 transition"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">
              <FileText className="w-4 h-4 inline mr-1.5 opacity-70" />
              Notes
              <span className="text-theme-muted font-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any notes about this filing..."
              rows={3}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-theme-primary placeholder:text-theme-muted focus:outline-none focus:border-theme-accent/50 transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/10 hover:bg-white/20 text-theme-secondary px-4 py-2.5 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 btn-theme-primary text-theme-primary px-4 py-2.5 rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSubmitting ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
              ) : (
                <><Check className="w-4 h-4" /> Mark as Filed</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FilingsPage() {
  const { user, filingDeadlines, nexusStates, updateFilingDeadline, refreshData, isLoading } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'pending' | 'filed' | 'overdue'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<{ created: number; skipped: number } | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [modalDeadline, setModalDeadline] = useState<FilingDeadline | null>(null);
  
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

  const handleGenerateDeadlines = async () => {
    setIsGenerating(true);
    setGenerateResult(null);
    setGenerateError(null);
    try {
      const res = await fetch('/api/filings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remainingOnly: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenerateError(data.error || 'Failed to generate deadlines');
      } else {
        setGenerateResult({ created: data.created, skipped: data.skipped });
        if (data.created > 0) {
          await refreshData();
        }
      }
    } catch {
      setGenerateError('An unexpected error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkFiled = async (id: string, extras: { actualTax?: number; confirmationNumber?: string; notes?: string }) => {
    await updateFilingDeadline(id, 'filed', extras);
    setModalDeadline(null);
  };

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
      
      {/* Mark as Filed Modal */}
      {modalDeadline && (
        <MarkFiledModal
          deadline={modalDeadline}
          onClose={() => setModalDeadline(null)}
          onConfirm={handleMarkFiled}
        />
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-theme-primary mb-2">Filing Calendar</h1>
            <p className="text-theme-muted">Track and manage your sales tax filing deadlines</p>
          </div>
          {hasNexus && (
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={handleGenerateDeadlines}
                disabled={isGenerating}
                className="btn-theme-primary text-theme-primary px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-60"
              >
                {isGenerating
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
                  : <><Wand2 className="w-4 h-4" /> Generate {new Date().getFullYear()} Deadlines</>
                }
              </button>
              {generateResult && (
                <p className="text-sm text-theme-accent">
                  {generateResult.created > 0
                    ? `✓ Created ${generateResult.created} deadline${generateResult.created !== 1 ? 's' : ''}${generateResult.skipped > 0 ? `, ${generateResult.skipped} already existed` : ''}`
                    : `All deadlines already up to date (${generateResult.skipped} existing)`
                  }
                </p>
              )}
              {generateError && (
                <p className="text-sm" style={{ color: 'var(--error-text)' }}>{generateError}</p>
              )}
            </div>
          )}
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
                              {/* Show filed details */}
                              {deadline.status === 'filed' && deadline.actualTax !== undefined && (
                                <p className="text-theme-accent text-sm mt-1">
                                  Paid: ${deadline.actualTax.toLocaleString()}
                                  {deadline.estimatedTax && deadline.actualTax !== deadline.estimatedTax && (
                                    <span className="text-theme-muted ml-1">
                                      (est. ${deadline.estimatedTax.toLocaleString()})
                                    </span>
                                  )}
                                </p>
                              )}
                              {deadline.status !== 'filed' && deadline.estimatedTax && (
                                <p className="text-theme-accent text-sm mt-1">
                                  Estimated: ${deadline.estimatedTax.toLocaleString()}
                                </p>
                              )}
                              {deadline.confirmationNumber && (
                                <p className="text-theme-muted text-xs mt-0.5">
                                  Conf# {deadline.confirmationNumber}
                                </p>
                              )}
                              {deadline.notes && (
                                <p className="text-theme-muted text-xs mt-0.5 italic">
                                  {deadline.notes}
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
                                {deadline.status === 'filed'
                                  ? deadline.filedAt
                                    ? `Filed ${new Date(deadline.filedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                    : 'Filed'
                                  : isPast
                                  ? `${Math.abs(daysUntil)} days overdue`
                                  : `${daysUntil} days left`}
                              </div>
                            </div>

                            {deadline.status !== 'filed' && (
                              <button
                                onClick={() => setModalDeadline(deadline)}
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
                              <div className="text-sm text-theme-muted mb-1">
                                {deadline.period.charAt(0).toUpperCase() + deadline.period.slice(1)}
                              </div>
                              {deadline.status === 'filed' && deadline.confirmationNumber && (
                                <div className="text-xs text-theme-muted mb-2">
                                  Conf# {deadline.confirmationNumber}
                                </div>
                              )}
                              {deadline.status !== 'filed' ? (
                                <button
                                  onClick={() => setModalDeadline(deadline)}
                                  className="w-full btn-theme-primary/20 hover:btn-theme-primary/30 text-theme-accent py-1.5 rounded text-sm transition mt-2"
                                >
                                  Mark Filed
                                </button>
                              ) : (
                                <div className="text-center text-theme-accent text-sm flex items-center justify-center gap-1 mt-2">
                                  <Check className="w-4 h-4" /> Filed
                                  {deadline.actualTax !== undefined && (
                                    <span className="text-theme-muted text-xs ml-1">(${deadline.actualTax.toLocaleString()})</span>
                                  )}
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

      <Footer />
    </div>
  );
}

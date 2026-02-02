'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { stateTaxRates, taxRateMetadata } from '@/data/taxRates';
import { NexusState } from '@/types';

const nexusReasons = [
  { value: 'physical', label: 'Physical Presence', description: 'Office, warehouse, employees, or inventory in state' },
  { value: 'economic', label: 'Economic Nexus', description: 'Exceeded sales threshold ($100K or 200 transactions in most states)' },
  { value: 'affiliate', label: 'Affiliate Nexus', description: 'Affiliates or referral partners in state' },
  { value: 'click-through', label: 'Click-Through Nexus', description: 'In-state website links driving sales' },
  { value: 'marketplace', label: 'Marketplace Facilitator', description: 'Sales through marketplace like Amazon' },
];

export default function NexusPage() {
  const { user, nexusStates, updateNexusStates, isLoading } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyNexus, setShowOnlyNexus] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Initialize nexus states if empty
  useEffect(() => {
    if (!isLoading && user && nexusStates.length === 0) {
      const initialStates: NexusState[] = stateTaxRates.map(s => ({
        stateCode: s.stateCode,
        state: s.state,
        hasNexus: false,
        nexusType: null,
      }));
      updateNexusStates(initialStates);
    }
  }, [isLoading, user, nexusStates.length, updateNexusStates]);

  const toggleNexus = (stateCode: string) => {
    const updated = nexusStates.map(s => {
      if (s.stateCode === stateCode) {
        return {
          ...s,
          hasNexus: !s.hasNexus,
          nexusType: !s.hasNexus ? 'economic' as const : null,
          registrationDate: !s.hasNexus ? new Date().toISOString() : undefined,
        };
      }
      return s;
    });
    updateNexusStates(updated);
  };

  const updateNexusType = (stateCode: string, nexusType: NexusState['nexusType']) => {
    const updated = nexusStates.map(s => {
      if (s.stateCode === stateCode) {
        return { ...s, nexusType };
      }
      return s;
    });
    updateNexusStates(updated);
  };

  const updateRegistration = (stateCode: string, registrationNumber: string) => {
    const updated = nexusStates.map(s => {
      if (s.stateCode === stateCode) {
        return { ...s, registrationNumber };
      }
      return s;
    });
    updateNexusStates(updated);
  };

  const filteredStates = nexusStates.filter(s => {
    const matchesSearch = s.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.stateCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !showOnlyNexus || s.hasNexus;
    return matchesSearch && matchesFilter;
  });

  const activeCount = nexusStates.filter(s => s.hasNexus).length;

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
          <h1 className="text-3xl font-bold text-theme-primary mb-2">Nexus Tracker</h1>
          <p className="text-theme-muted">Manage which states you have sales tax obligations in</p>
        </div>

        {/* Info Banner */}
        <div className="rounded-xl p-6 mb-8" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--info-text)' }}>What is Nexus?</h2>
          <p className="text-theme-secondary text-sm mb-4">
            Nexus is a connection between your business and a state that creates a tax obligation. 
            If you have nexus in a state, you must collect and remit sales tax there.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {nexusReasons.map(reason => (
              <div key={reason.value} className="bg-white/5 rounded-lg p-3">
                <div className="font-medium text-theme-primary text-sm">{reason.label}</div>
                <div className="text-theme-muted text-xs mt-1">{reason.description}</div>
              </div>
            ))}
          </div>
          
          {/* Tax Rate Update Note */}
          <div className="mt-4 pt-4 border-t border-theme-primary flex items-center gap-2 text-sm text-theme-muted">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>
              Tax rates are regularly updated to reflect changes in state and local tax laws. 
              Last updated: {new Date(taxRateMetadata.lastUpdated).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="card-theme rounded-xl p-4 border border-theme-primary">
            <div className="text-2xl font-bold text-theme-primary">{activeCount}</div>
            <div className="text-sm text-theme-muted">Active Nexus States</div>
          </div>
          <div className="card-theme rounded-xl p-4 border border-theme-primary">
            <div className="text-2xl font-bold text-theme-primary">{51 - activeCount}</div>
            <div className="text-sm text-theme-muted">States Without Nexus</div>
          </div>
          <div className="card-theme rounded-xl p-4 border border-theme-primary">
            <div className="text-2xl font-bold text-theme-primary">
              {nexusStates.filter(s => s.hasNexus && s.registrationNumber).length}
            </div>
            <div className="text-sm text-theme-muted">Registered</div>
          </div>
          <div className="card-theme rounded-xl p-4 border border-theme-primary">
            <div className="text-2xl font-bold text-theme-primary">
              {nexusStates.filter(s => s.hasNexus && !s.registrationNumber).length}
            </div>
            <div className="text-sm text-theme-muted">Pending Registration</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search states..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <label className="flex items-center gap-2 px-4 py-3 bg-white/10 border border-white/20 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyNexus}
              onChange={(e) => setShowOnlyNexus(e.target.checked)}
              className="rounded border-gray-600 text-theme-accent focus:ring-emerald-500"
            />
            <span className="text-theme-secondary">Show only nexus states</span>
          </label>
        </div>

        {/* State List */}
        <div className="card-theme rounded-xl border border-theme-primary overflow-hidden">
          <div className="grid gap-1 p-4">
            {filteredStates.map((state) => {
              const taxInfo = stateTaxRates.find(s => s.stateCode === state.stateCode);
              
              return (
                <div 
                  key={state.stateCode}
                  className={`p-4 rounded-lg transition ${
                    state.hasNexus 
                      ? 'btn-theme-primary/10 border border-theme-accent/30' 
                      : 'bg-white/5 border border-transparent hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Toggle */}
                    <button
                      onClick={() => toggleNexus(state.stateCode)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        state.hasNexus ? 'btn-theme-primary' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        state.hasNexus ? 'translate-x-6' : ''
                      }`} />
                    </button>

                    {/* State Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-theme-primary">{state.state}</h3>
                        <span className="text-theme-muted text-sm">{state.stateCode}</span>
                        {taxInfo && taxInfo.combinedRate === 0 && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                            No Sales Tax
                          </span>
                        )}
                      </div>
                      
                      {taxInfo && (
                        <div className="text-sm text-theme-muted mt-1">
                          State rate: {taxInfo.stateRate}% | Combined avg: {taxInfo.combinedRate}%
                        </div>
                      )}

                      {/* Nexus Details */}
                      {state.hasNexus && (
                        <div className="mt-3 grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-theme-muted mb-1">Nexus Reason</label>
                            <select
                              value={state.nexusType || ''}
                              onChange={(e) => updateNexusType(state.stateCode, e.target.value as NexusState['nexusType'])}
                              className="w-full px-3 py-2 border border-theme-primary rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              style={{ backgroundColor: 'var(--bg-input)' }}
                            >
                              {nexusReasons.map(r => (
                                <option key={r.value} value={r.value} style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-theme-muted mb-1">Registration Number</label>
                            <input
                              type="text"
                              value={state.registrationNumber || ''}
                              onChange={(e) => updateRegistration(state.stateCode, e.target.value)}
                              placeholder="Enter if registered"
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="hidden sm:block">
                      {state.hasNexus ? (
                        <span className="px-3 py-1 btn-theme-primary/20 text-theme-accent text-sm rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-500/20 text-theme-muted text-sm rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

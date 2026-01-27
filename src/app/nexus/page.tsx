'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import { stateTaxRates } from '@/data/taxRates';
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
        reason: null,
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
          reason: !s.hasNexus ? 'economic' as const : null,
          registrationDate: !s.hasNexus ? new Date().toISOString() : undefined,
        };
      }
      return s;
    });
    updateNexusStates(updated);
  };

  const updateReason = (stateCode: string, reason: NexusState['reason']) => {
    const updated = nexusStates.map(s => {
      if (s.stateCode === stateCode) {
        return { ...s, reason };
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
          <h1 className="text-3xl font-bold text-white mb-2">Nexus Tracker</h1>
          <p className="text-gray-400">Manage which states you have sales tax obligations in</p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-400 mb-2">What is Nexus?</h2>
          <p className="text-gray-300 text-sm mb-4">
            Nexus is a connection between your business and a state that creates a tax obligation. 
            If you have nexus in a state, you must collect and remit sales tax there.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {nexusReasons.map(reason => (
              <div key={reason.value} className="bg-white/5 rounded-lg p-3">
                <div className="font-medium text-white text-sm">{reason.label}</div>
                <div className="text-gray-500 text-xs mt-1">{reason.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
            <div className="text-2xl font-bold text-white">{activeCount}</div>
            <div className="text-sm text-gray-400">Active Nexus States</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
            <div className="text-2xl font-bold text-white">{51 - activeCount}</div>
            <div className="text-sm text-gray-400">States Without Nexus</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
            <div className="text-2xl font-bold text-white">
              {nexusStates.filter(s => s.hasNexus && s.registrationNumber).length}
            </div>
            <div className="text-sm text-gray-400">Registered</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
            <div className="text-2xl font-bold text-white">
              {nexusStates.filter(s => s.hasNexus && !s.registrationNumber).length}
            </div>
            <div className="text-sm text-gray-400">Pending Registration</div>
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
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <label className="flex items-center gap-2 px-4 py-3 bg-white/10 border border-white/20 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyNexus}
              onChange={(e) => setShowOnlyNexus(e.target.checked)}
              className="rounded border-gray-600 text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-gray-300">Show only nexus states</span>
          </label>
        </div>

        {/* State List */}
        <div className="bg-white/10 backdrop-blur rounded-xl border border-white/10 overflow-hidden">
          <div className="grid gap-1 p-4">
            {filteredStates.map((state) => {
              const taxInfo = stateTaxRates.find(s => s.stateCode === state.stateCode);
              
              return (
                <div 
                  key={state.stateCode}
                  className={`p-4 rounded-lg transition ${
                    state.hasNexus 
                      ? 'bg-emerald-500/10 border border-emerald-500/30' 
                      : 'bg-white/5 border border-transparent hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Toggle */}
                    <button
                      onClick={() => toggleNexus(state.stateCode)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        state.hasNexus ? 'bg-emerald-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        state.hasNexus ? 'translate-x-6' : ''
                      }`} />
                    </button>

                    {/* State Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-white">{state.state}</h3>
                        <span className="text-gray-500 text-sm">{state.stateCode}</span>
                        {taxInfo && taxInfo.combinedRate === 0 && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                            No Sales Tax
                          </span>
                        )}
                      </div>
                      
                      {taxInfo && (
                        <div className="text-sm text-gray-400 mt-1">
                          State rate: {taxInfo.stateRate}% | Combined avg: {taxInfo.combinedRate}%
                        </div>
                      )}

                      {/* Nexus Details */}
                      {state.hasNexus && (
                        <div className="mt-3 grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Nexus Reason</label>
                            <select
                              value={state.reason || ''}
                              onChange={(e) => updateReason(state.stateCode, e.target.value as NexusState['reason'])}
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                              {nexusReasons.map(r => (
                                <option key={r.value} value={r.value} className="bg-slate-800">
                                  {r.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Registration Number</label>
                            <input
                              type="text"
                              value={state.registrationNumber || ''}
                              onChange={(e) => updateRegistration(state.stateCode, e.target.value)}
                              placeholder="Enter if registered"
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="hidden sm:block">
                      {state.hasNexus ? (
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-500/20 text-gray-400 text-sm rounded-full">
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
    </div>
  );
}

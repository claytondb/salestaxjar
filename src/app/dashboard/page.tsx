'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';

export default function DashboardPage() {
  const { 
    user, 
    businessProfile, 
    nexusStates, 
    calculations, 
    filingDeadlines, 
    connectedPlatforms,
    billing,
    isLoading 
  } = useAuth();
  const router = useRouter();
  
  // Use state for current time to avoid calling Date.now() during render
  const [currentTime] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  const activeNexusCount = nexusStates.filter(s => s.hasNexus).length;
  const connectedCount = connectedPlatforms.filter(p => p.connected).length;
  const pendingFilings = filingDeadlines.filter(f => f.status === 'pending').length;
  const totalTaxCollected = calculations.reduce((sum, c) => sum + c.taxAmount, 0);

  const upcomingDeadlines = filingDeadlines
    .filter(f => f.status === 'pending')
    .slice(0, 3);

  const recentCalculations = calculations.slice(0, 5);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text)] mb-2">
            Welcome back, {user.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-[var(--color-text-muted)]">
            Here&apos;s an overview of your sales tax compliance status.
          </p>
        </div>

        {/* Setup Checklist (if not complete) */}
        {(!businessProfile || activeNexusCount === 0 || connectedCount === 0) && (
          <div className="bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-[var(--color-warning)] mb-4">Complete your setup</h2>
            <div className="space-y-3">
              {!businessProfile && (
                <Link href="/settings" className="flex items-center gap-3 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition">
                  <div className="w-6 h-6 rounded-full border-2 border-[var(--color-text-light)] flex items-center justify-center text-sm">1</div>
                  <span>Set up your business profile</span>
                  <span className="ml-auto text-[var(--color-primary)]">→</span>
                </Link>
              )}
              {businessProfile && (
                <div className="flex items-center gap-3 text-[var(--color-success)]">
                  <div className="w-6 h-6 rounded-full bg-[var(--color-success-bg)] flex items-center justify-center text-sm">✓</div>
                  <span>Business profile complete</span>
                </div>
              )}
              {activeNexusCount === 0 && (
                <Link href="/nexus" className="flex items-center gap-3 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition">
                  <div className="w-6 h-6 rounded-full border-2 border-[var(--color-text-light)] flex items-center justify-center text-sm">2</div>
                  <span>Configure your nexus states</span>
                  <span className="ml-auto text-[var(--color-primary)]">→</span>
                </Link>
              )}
              {activeNexusCount > 0 && (
                <div className="flex items-center gap-3 text-[var(--color-success)]">
                  <div className="w-6 h-6 rounded-full bg-[var(--color-success-bg)] flex items-center justify-center text-sm">✓</div>
                  <span>Nexus states configured ({activeNexusCount} states)</span>
                </div>
              )}
              {connectedCount === 0 && (
                <Link href="/settings#platforms" className="flex items-center gap-3 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition">
                  <div className="w-6 h-6 rounded-full border-2 border-[var(--color-text-light)] flex items-center justify-center text-sm">3</div>
                  <span>Connect your sales platforms</span>
                  <span className="ml-auto text-[var(--color-primary)]">→</span>
                </Link>
              )}
              {connectedCount > 0 && (
                <div className="flex items-center gap-3 text-[var(--color-success)]">
                  <div className="w-6 h-6 rounded-full bg-[var(--color-success-bg)] flex items-center justify-center text-sm">✓</div>
                  <span>Platforms connected ({connectedCount} platforms)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[var(--color-bg-card)] rounded-xl p-6 border border-[var(--color-border)] shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--color-text-muted)] text-sm">Active Nexus States</span>
              <span className="text-2xl">🗺️</span>
            </div>
            <div className="text-3xl font-bold text-[var(--color-text)]">{activeNexusCount}</div>
            <Link href="/nexus" className="text-[var(--color-primary)] text-sm hover:underline mt-2 inline-block">
              Manage states →
            </Link>
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-xl p-6 border border-[var(--color-border)] shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--color-text-muted)] text-sm">Pending Filings</span>
              <span className="text-2xl">📋</span>
            </div>
            <div className="text-3xl font-bold text-[var(--color-text)]">{pendingFilings}</div>
            <Link href="/filings" className="text-[var(--color-primary)] text-sm hover:underline mt-2 inline-block">
              View calendar →
            </Link>
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-xl p-6 border border-[var(--color-border)] shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--color-text-muted)] text-sm">Tax Calculated</span>
              <span className="text-2xl">💰</span>
            </div>
            <div className="text-3xl font-bold text-[var(--color-text)]">${totalTaxCollected.toFixed(2)}</div>
            <Link href="/calculator" className="text-[var(--color-primary)] text-sm hover:underline mt-2 inline-block">
              New calculation →
            </Link>
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-xl p-6 border border-[var(--color-border)] shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--color-text-muted)] text-sm">Connected Platforms</span>
              <span className="text-2xl">🔗</span>
            </div>
            <div className="text-3xl font-bold text-[var(--color-text)]">{connectedCount}</div>
            <Link href="/settings#platforms" className="text-[var(--color-primary)] text-sm hover:underline mt-2 inline-block">
              Connect more →
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upcoming Deadlines */}
          <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--color-text)]">Upcoming Deadlines</h2>
                <Link href="/filings" className="text-[var(--color-primary)] text-sm hover:underline">
                  View all
                </Link>
              </div>
            </div>
            <div className="p-6">
              {upcomingDeadlines.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-4xl mb-4 block">📅</span>
                  <p className="text-[var(--color-text-muted)]">No upcoming deadlines</p>
                  <p className="text-[var(--color-text-light)] text-sm mt-1">Configure your nexus states to see filing deadlines</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingDeadlines.map((deadline) => {
                    const dueDate = new Date(deadline.dueDate);
                    const daysUntil = Math.ceil((dueDate.getTime() - currentTime) / (1000 * 60 * 60 * 24));
                    const isUrgent = daysUntil <= 7;
                    
                    return (
                      <div key={deadline.id} className="flex items-center justify-between p-4 bg-[var(--color-bg-muted)] rounded-lg">
                        <div>
                          <div className="font-medium text-[var(--color-text)]">{deadline.state}</div>
                          <div className="text-sm text-[var(--color-text-muted)]">
                            {deadline.period.charAt(0).toUpperCase() + deadline.period.slice(1)} filing
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${isUrgent ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-secondary)]'}`}>
                            {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          <div className={`text-sm ${isUrgent ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-light)]'}`}>
                            {daysUntil} days left
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Calculations */}
          <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--color-text)]">Recent Calculations</h2>
                <Link href="/calculator" className="text-[var(--color-primary)] text-sm hover:underline">
                  New calculation
                </Link>
              </div>
            </div>
            <div className="p-6">
              {recentCalculations.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-4xl mb-4 block">🧮</span>
                  <p className="text-[var(--color-text-muted)]">No calculations yet</p>
                  <Link href="/calculator" className="text-[var(--color-primary)] text-sm hover:underline mt-2 inline-block">
                    Try the calculator →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCalculations.map((calc) => (
                    <div key={calc.id} className="flex items-center justify-between p-3 bg-[var(--color-bg-muted)] rounded-lg">
                      <div>
                        <div className="font-medium text-[var(--color-text)]">${calc.amount.toFixed(2)}</div>
                        <div className="text-sm text-[var(--color-text-muted)]">{calc.state}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-[var(--color-success)]">+${calc.taxAmount.toFixed(2)}</div>
                        <div className="text-sm text-[var(--color-text-light)]">{calc.rate}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Connected Platforms Section */}
        <div className="mt-8 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">Connected Platforms</h2>
              <Link href="/settings#platforms" className="text-[var(--color-primary)] text-sm hover:underline">
                Manage
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
              {connectedPlatforms.map((platform) => (
                <div 
                  key={platform.id}
                  className={`p-4 rounded-lg border text-center transition ${
                    platform.connected 
                      ? 'bg-[var(--color-success-bg)] border-[var(--color-success-border)]' 
                      : 'bg-[var(--color-bg-muted)] border-[var(--color-border)] opacity-50'
                  }`}
                >
                  <div className="text-2xl mb-2">
                    {platform.type === 'shopify' && '🛒'}
                    {platform.type === 'amazon' && '📦'}
                    {platform.type === 'etsy' && '🎨'}
                    {platform.type === 'woocommerce' && '🔌'}
                    {platform.type === 'bigcommerce' && '🏪'}
                    {platform.type === 'ebay' && '🏷️'}
                    {platform.type === 'square' && '⬛'}
                  </div>
                  <div className="text-sm font-medium text-[var(--color-text)]">{platform.name}</div>
                  <div className={`text-xs mt-1 ${platform.connected ? 'text-[var(--color-success)]' : 'text-[var(--color-text-light)]'}`}>
                    {platform.connected ? 'Connected' : 'Not connected'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Plan Banner */}
        <div className="mt-8 bg-[var(--color-primary-bg)] rounded-xl p-6 border border-[var(--color-primary-border)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-[var(--color-text)]">
                  {billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1)} Plan
                </h3>
                <span className="px-2 py-0.5 bg-[var(--color-primary-bg)] text-[var(--color-primary)] text-xs rounded-full border border-[var(--color-primary-border)]">
                  ${billing.monthlyPrice}/mo
                </span>
              </div>
              <p className="text-[var(--color-text-muted)] text-sm">
                {billing.plan === 'starter' && 'Upgrade to Growth for unlimited state filings and advanced features.'}
                {billing.plan === 'growth' && 'You have access to all growth features including nexus tracking.'}
                {billing.plan === 'enterprise' && 'You have unlimited access to all features and dedicated support.'}
              </p>
            </div>
            {billing.plan !== 'enterprise' && (
              <Link 
                href="/settings#billing" 
                className="bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white px-4 py-2 rounded-lg font-medium transition whitespace-nowrap shadow-md"
              >
                Upgrade Plan
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

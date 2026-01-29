'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { 
  MapPin, 
  ClipboardList, 
  DollarSign, 
  Link2, 
  Calendar, 
  Calculator,
  ShoppingCart,
  Package,
  Palette,
  Plug,
  Store,
  Tag,
  Square
} from 'lucide-react';

const ICON_CLASS = "w-6 h-6 text-theme-accent";

const platformIcons: Record<string, React.ReactNode> = {
  shopify: <ShoppingCart className="w-6 h-6 text-theme-secondary" />,
  amazon: <Package className="w-6 h-6 text-theme-secondary" />,
  etsy: <Palette className="w-6 h-6 text-theme-secondary" />,
  woocommerce: <Plug className="w-6 h-6 text-theme-secondary" />,
  bigcommerce: <Store className="w-6 h-6 text-theme-secondary" />,
  ebay: <Tag className="w-6 h-6 text-theme-secondary" />,
  square: <Square className="w-6 h-6 text-theme-secondary" />,
};

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
  
  const [currentTime] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-theme-gradient flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--accent-primary)' }}></div>
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
    <div className="min-h-screen bg-theme-gradient">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-theme-primary mb-2">
            Welcome back, {user.name.split(' ')[0]}!
          </h1>
          <p className="text-theme-muted">
            Here&apos;s an overview of your sales tax compliance status.
          </p>
        </div>

        {/* Setup Checklist (if not complete) */}
        {(!businessProfile || activeNexusCount === 0 || connectedCount === 0) && (
          <div className="rounded-xl p-6 mb-8 card-theme border-2" style={{ borderColor: 'var(--accent-primary)' }}>
            <h2 className="text-lg font-semibold mb-4 text-theme-accent">Complete your setup</h2>
            <div className="space-y-3">
              {!businessProfile && (
                <Link href="/settings" className="flex items-center gap-3 text-theme-secondary hover:text-theme-primary transition">
                  <div className="w-6 h-6 rounded-full border-2 border-theme-secondary flex items-center justify-center text-sm">1</div>
                  <span>Set up your business profile</span>
                  <span className="ml-auto text-theme-accent">→</span>
                </Link>
              )}
              {businessProfile && (
                <div className="flex items-center gap-3 text-theme-accent">
                  <div className="w-6 h-6 rounded-full bg-accent-subtle flex items-center justify-center text-sm">✓</div>
                  <span>Business profile complete</span>
                </div>
              )}
              {activeNexusCount === 0 && (
                <Link href="/nexus" className="flex items-center gap-3 text-theme-secondary hover:text-theme-primary transition">
                  <div className="w-6 h-6 rounded-full border-2 border-theme-secondary flex items-center justify-center text-sm">2</div>
                  <span>Configure your nexus states</span>
                  <span className="ml-auto text-theme-accent">→</span>
                </Link>
              )}
              {activeNexusCount > 0 && (
                <div className="flex items-center gap-3 text-theme-accent">
                  <div className="w-6 h-6 rounded-full bg-accent-subtle flex items-center justify-center text-sm">✓</div>
                  <span>Nexus states configured ({activeNexusCount} states)</span>
                </div>
              )}
              {connectedCount === 0 && (
                <Link href="/settings#platforms" className="flex items-center gap-3 text-theme-secondary hover:text-theme-primary transition">
                  <div className="w-6 h-6 rounded-full border-2 border-theme-secondary flex items-center justify-center text-sm">3</div>
                  <span>Connect your sales platforms</span>
                  <span className="ml-auto text-theme-accent">→</span>
                </Link>
              )}
              {connectedCount > 0 && (
                <div className="flex items-center gap-3 text-theme-accent">
                  <div className="w-6 h-6 rounded-full bg-accent-subtle flex items-center justify-center text-sm">✓</div>
                  <span>Platforms connected ({connectedCount} platforms)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card-theme rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-theme-muted text-sm">Active Nexus States</span>
              <MapPin className={ICON_CLASS} />
            </div>
            <div className="text-3xl font-bold text-theme-primary">{activeNexusCount}</div>
            <Link href="/nexus" className="text-theme-accent text-sm hover:opacity-80 mt-2 inline-block">
              Manage states →
            </Link>
          </div>

          <div className="card-theme rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-theme-muted text-sm">Pending Filings</span>
              <ClipboardList className={ICON_CLASS} />
            </div>
            <div className="text-3xl font-bold text-theme-primary">{pendingFilings}</div>
            <Link href="/filings" className="text-theme-accent text-sm hover:opacity-80 mt-2 inline-block">
              View calendar →
            </Link>
          </div>

          <div className="card-theme rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-theme-muted text-sm">Tax Calculated</span>
              <DollarSign className={ICON_CLASS} />
            </div>
            <div className="text-3xl font-bold text-theme-primary">${totalTaxCollected.toFixed(2)}</div>
            <Link href="/calculator" className="text-theme-accent text-sm hover:opacity-80 mt-2 inline-block">
              New calculation →
            </Link>
          </div>

          <div className="card-theme rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-theme-muted text-sm">Connected Platforms</span>
              <Link2 className={ICON_CLASS} />
            </div>
            <div className="text-3xl font-bold text-theme-primary">{connectedCount}</div>
            <Link href="/settings#platforms" className="text-theme-accent text-sm hover:opacity-80 mt-2 inline-block">
              Connect more →
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upcoming Deadlines */}
          <div className="card-theme rounded-xl overflow-hidden">
            <div className="p-6 border-b border-theme-primary">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-theme-primary">Upcoming Deadlines</h2>
                <Link href="/filings" className="text-theme-accent text-sm hover:opacity-80">
                  View all
                </Link>
              </div>
            </div>
            <div className="p-6">
              {upcomingDeadlines.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 text-theme-accent mx-auto mb-4" />
                  <p className="text-theme-muted">No upcoming deadlines</p>
                  <p className="text-theme-muted text-sm mt-1">Configure your nexus states to see filing deadlines</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingDeadlines.map((deadline) => {
                    const dueDate = new Date(deadline.dueDate);
                    const daysUntil = Math.ceil((dueDate.getTime() - currentTime) / (1000 * 60 * 60 * 24));
                    const isUrgent = daysUntil <= 7;
                    
                    return (
                      <div key={deadline.id} className="flex items-center justify-between p-4 bg-theme-secondary/30 rounded-lg">
                        <div>
                          <div className="font-medium text-theme-primary">{deadline.state}</div>
                          <div className="text-sm text-theme-muted">
                            {deadline.period.charAt(0).toUpperCase() + deadline.period.slice(1)} filing
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${isUrgent ? 'text-amber-500' : 'text-theme-secondary'}`}>
                            {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          <div className={`text-sm ${isUrgent ? 'text-amber-500' : 'text-theme-muted'}`}>
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
          <div className="card-theme rounded-xl overflow-hidden">
            <div className="p-6 border-b border-theme-primary">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-theme-primary">Recent Calculations</h2>
                <Link href="/calculator" className="text-theme-accent text-sm hover:opacity-80">
                  New calculation
                </Link>
              </div>
            </div>
            <div className="p-6">
              {recentCalculations.length === 0 ? (
                <div className="text-center py-8">
                  <Calculator className="w-10 h-10 text-theme-accent mx-auto mb-4" />
                  <p className="text-theme-muted">No calculations yet</p>
                  <Link href="/calculator" className="text-theme-accent text-sm hover:opacity-80 mt-2 inline-block">
                    Try the calculator →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCalculations.map((calc) => (
                    <div key={calc.id} className="flex items-center justify-between p-3 bg-theme-secondary/30 rounded-lg">
                      <div>
                        <div className="font-medium text-theme-primary">${calc.amount.toFixed(2)}</div>
                        <div className="text-sm text-theme-muted">{calc.state}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-theme-accent">+${calc.taxAmount.toFixed(2)}</div>
                        <div className="text-sm text-theme-muted">{calc.rate}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Connected Platforms Section */}
        <div className="mt-8 card-theme rounded-xl overflow-hidden">
          <div className="p-6 border-b border-theme-primary">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-theme-primary">Connected Platforms</h2>
              <Link href="/settings#platforms" className="text-theme-accent text-sm hover:opacity-80">
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
                      ? 'bg-accent-subtle border-theme-accent' 
                      : 'bg-theme-secondary/30 border-theme-primary opacity-50'
                  }`}
                >
                  <div className="flex justify-center mb-2">
                    {platformIcons[platform.type] || <Package className="w-6 h-6 text-theme-accent" />}
                  </div>
                  <div className="text-sm font-medium text-theme-primary">{platform.name}</div>
                  <div className={`text-xs mt-1 ${platform.connected ? 'text-theme-accent' : 'text-theme-muted'}`}>
                    {platform.connected ? 'Connected' : 'Not connected'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Plan Banner */}
        <div className="mt-8 bg-accent-subtle rounded-xl p-6 border border-theme-accent">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-theme-primary">
                  {billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1)} Plan
                </h3>
                <span className="px-2 py-0.5 bg-accent-subtle text-theme-accent text-xs rounded-full border border-theme-accent">
                  ${billing.monthlyPrice}/mo
                </span>
              </div>
              <p className="text-theme-muted text-sm">
                {billing.plan === 'starter' && 'Upgrade to Growth for unlimited state filings and advanced features.'}
                {billing.plan === 'pro' && 'You have access to all growth features including nexus tracking.'}
                {billing.plan === 'business' && 'You have unlimited access to all features and priority email support.'}
              </p>
            </div>
            {billing.plan !== 'business' && (
              <Link 
                href="/settings#billing" 
                className="btn-theme-primary px-4 py-2 rounded-lg font-medium transition whitespace-nowrap"
              >
                Upgrade Plan
              </Link>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
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

const ICON_CLASS = "w-6 h-6 text-emerald-400";

const platformIcons: Record<string, React.ReactNode> = {
  shopify: <ShoppingCart className="w-6 h-6 text-emerald-400" />,
  amazon: <Package className="w-6 h-6 text-emerald-400" />,
  etsy: <Palette className="w-6 h-6 text-emerald-400" />,
  woocommerce: <Plug className="w-6 h-6 text-emerald-400" />,
  bigcommerce: <Store className="w-6 h-6 text-emerald-400" />,
  ebay: <Tag className="w-6 h-6 text-emerald-400" />,
  square: <Square className="w-6 h-6 text-emerald-400" />,
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
  
  // Use state for current time to avoid calling Date.now() during render
  // Initialize with a function to avoid the impure call during render
  const [currentTime] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user.name.split(' ')[0]}!
          </h1>
          <p className="text-gray-400">
            Here&apos;s an overview of your sales tax compliance status.
          </p>
        </div>

        {/* Setup Checklist (if not complete) */}
        {(!businessProfile || activeNexusCount === 0 || connectedCount === 0) && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-amber-400 mb-4">Complete your setup</h2>
            <div className="space-y-3">
              {!businessProfile && (
                <Link href="/settings" className="flex items-center gap-3 text-gray-300 hover:text-white transition">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-500 flex items-center justify-center text-sm">1</div>
                  <span>Set up your business profile</span>
                  <span className="ml-auto text-emerald-400">→</span>
                </Link>
              )}
              {businessProfile && (
                <div className="flex items-center gap-3 text-emerald-400">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm">✓</div>
                  <span>Business profile complete</span>
                </div>
              )}
              {activeNexusCount === 0 && (
                <Link href="/nexus" className="flex items-center gap-3 text-gray-300 hover:text-white transition">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-500 flex items-center justify-center text-sm">2</div>
                  <span>Configure your nexus states</span>
                  <span className="ml-auto text-emerald-400">→</span>
                </Link>
              )}
              {activeNexusCount > 0 && (
                <div className="flex items-center gap-3 text-emerald-400">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm">✓</div>
                  <span>Nexus states configured ({activeNexusCount} states)</span>
                </div>
              )}
              {connectedCount === 0 && (
                <Link href="/settings#platforms" className="flex items-center gap-3 text-gray-300 hover:text-white transition">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-500 flex items-center justify-center text-sm">3</div>
                  <span>Connect your sales platforms</span>
                  <span className="ml-auto text-emerald-400">→</span>
                </Link>
              )}
              {connectedCount > 0 && (
                <div className="flex items-center gap-3 text-emerald-400">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm">✓</div>
                  <span>Platforms connected ({connectedCount} platforms)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Active Nexus States</span>
              <MapPin className={ICON_CLASS} />
            </div>
            <div className="text-3xl font-bold text-white">{activeNexusCount}</div>
            <Link href="/nexus" className="text-emerald-400 text-sm hover:text-emerald-300 mt-2 inline-block">
              Manage states →
            </Link>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Pending Filings</span>
              <ClipboardList className={ICON_CLASS} />
            </div>
            <div className="text-3xl font-bold text-white">{pendingFilings}</div>
            <Link href="/filings" className="text-emerald-400 text-sm hover:text-emerald-300 mt-2 inline-block">
              View calendar →
            </Link>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Tax Calculated</span>
              <DollarSign className={ICON_CLASS} />
            </div>
            <div className="text-3xl font-bold text-white">${totalTaxCollected.toFixed(2)}</div>
            <Link href="/calculator" className="text-emerald-400 text-sm hover:text-emerald-300 mt-2 inline-block">
              New calculation →
            </Link>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Connected Platforms</span>
              <Link2 className={ICON_CLASS} />
            </div>
            <div className="text-3xl font-bold text-white">{connectedCount}</div>
            <Link href="/settings#platforms" className="text-emerald-400 text-sm hover:text-emerald-300 mt-2 inline-block">
              Connect more →
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upcoming Deadlines */}
          <div className="bg-white/10 backdrop-blur rounded-xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Upcoming Deadlines</h2>
                <Link href="/filings" className="text-emerald-400 text-sm hover:text-emerald-300">
                  View all
                </Link>
              </div>
            </div>
            <div className="p-6">
              {upcomingDeadlines.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
                  <p className="text-gray-400">No upcoming deadlines</p>
                  <p className="text-gray-500 text-sm mt-1">Configure your nexus states to see filing deadlines</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingDeadlines.map((deadline) => {
                    const dueDate = new Date(deadline.dueDate);
                    const daysUntil = Math.ceil((dueDate.getTime() - currentTime) / (1000 * 60 * 60 * 24));
                    const isUrgent = daysUntil <= 7;
                    
                    return (
                      <div key={deadline.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div>
                          <div className="font-medium text-white">{deadline.state}</div>
                          <div className="text-sm text-gray-400">
                            {deadline.period.charAt(0).toUpperCase() + deadline.period.slice(1)} filing
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${isUrgent ? 'text-amber-400' : 'text-gray-300'}`}>
                            {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          <div className={`text-sm ${isUrgent ? 'text-amber-400' : 'text-gray-500'}`}>
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
          <div className="bg-white/10 backdrop-blur rounded-xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Recent Calculations</h2>
                <Link href="/calculator" className="text-emerald-400 text-sm hover:text-emerald-300">
                  New calculation
                </Link>
              </div>
            </div>
            <div className="p-6">
              {recentCalculations.length === 0 ? (
                <div className="text-center py-8">
                  <Calculator className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
                  <p className="text-gray-400">No calculations yet</p>
                  <Link href="/calculator" className="text-emerald-400 text-sm hover:text-emerald-300 mt-2 inline-block">
                    Try the calculator →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCalculations.map((calc) => (
                    <div key={calc.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div>
                        <div className="font-medium text-white">${calc.amount.toFixed(2)}</div>
                        <div className="text-sm text-gray-400">{calc.state}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-emerald-400">+${calc.taxAmount.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">{calc.rate}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Connected Platforms Section */}
        <div className="mt-8 bg-white/10 backdrop-blur rounded-xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Connected Platforms</h2>
              <Link href="/settings#platforms" className="text-emerald-400 text-sm hover:text-emerald-300">
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
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-white/5 border-white/10 opacity-50'
                  }`}
                >
                  <div className="flex justify-center mb-2">
                    {platformIcons[platform.type] || <Package className="w-6 h-6 text-emerald-400" />}
                  </div>
                  <div className="text-sm font-medium text-white">{platform.name}</div>
                  <div className={`text-xs mt-1 ${platform.connected ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {platform.connected ? 'Connected' : 'Not connected'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Plan Banner */}
        <div className="mt-8 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-xl p-6 border border-emerald-500/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-white">
                  {billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1)} Plan
                </h3>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                  ${billing.monthlyPrice}/mo
                </span>
              </div>
              <p className="text-gray-400 text-sm">
                {billing.plan === 'starter' && 'Upgrade to Growth for unlimited state filings and advanced features.'}
                {billing.plan === 'growth' && 'You have access to all growth features including nexus tracking.'}
                {billing.plan === 'enterprise' && 'You have unlimited access to all features and dedicated support.'}
              </p>
            </div>
            {billing.plan !== 'enterprise' && (
              <Link 
                href="/settings#billing" 
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition whitespace-nowrap"
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

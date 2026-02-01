'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import { 
  Users, 
  CreditCard, 
  CheckCircle, 
  Clock,
  Store,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Mail,
  Calendar,
  ShoppingCart
} from 'lucide-react';

interface Customer {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  emailVerified: boolean;
  plan: string;
  subscriptionStatus: string | null;
  renewsAt: string | null;
  cancelAtPeriodEnd: boolean;
  platforms: Array<{
    platform: string;
    name: string | null;
    lastSync: string | null;
  }>;
  transactionCount: number;
  daysSinceSignup: number;
}

interface Stats {
  totalCustomers: number;
  verifiedCustomers: number;
  paidCustomers: number;
  planBreakdown: {
    free: number;
    starter: number;
    pro: number;
    business: number;
  };
}

const ADMIN_EMAILS = ['david@sails.tax', 'claytondb@gmail.com'];

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'plan'>('newest');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (!authLoading && user && !ADMIN_EMAILS.includes(user.email)) {
      router.push('/dashboard');
      return;
    }

    if (user && ADMIN_EMAILS.includes(user.email)) {
      fetchCustomers();
    }
  }, [user, authLoading, router]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/customers');
      if (!res.ok) {
        throw new Error('Failed to fetch customers');
      }
      const data = await res.json();
      setCustomers(data.customers);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const sortedCustomers = [...customers].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === 'plan') {
      const planOrder = { business: 0, pro: 1, starter: 2, free: 3 };
      return (planOrder[a.plan as keyof typeof planOrder] || 4) - (planOrder[b.plan as keyof typeof planOrder] || 4);
    }
    return 0;
  });

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'business': return 'bg-purple-500/20 text-purple-400';
      case 'pro': return 'bg-blue-500/20 text-blue-400';
      case 'starter': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatRelativeTime = (days: number) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-theme-gradient">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <RefreshCw className="w-8 h-8 text-theme-accent animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-theme-gradient">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-red-400">{error}</p>
          <button onClick={fetchCustomers} className="mt-4 btn-theme-primary px-4 py-2 rounded-lg">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-gradient">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-theme-primary">Admin Dashboard</h1>
            <p className="text-theme-muted mt-1">Manage your Sails customers</p>
          </div>
          <button
            onClick={fetchCustomers}
            className="flex items-center gap-2 px-4 py-2 border border-theme-secondary rounded-lg text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card-theme rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-theme-accent" />
                <span className="text-theme-muted text-sm">Total Customers</span>
              </div>
              <p className="text-3xl font-bold text-theme-primary">{stats.totalCustomers}</p>
            </div>
            <div className="card-theme rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-theme-muted text-sm">Verified</span>
              </div>
              <p className="text-3xl font-bold text-theme-primary">{stats.verifiedCustomers}</p>
            </div>
            <div className="card-theme rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <CreditCard className="w-5 h-5 text-blue-400" />
                <span className="text-theme-muted text-sm">Paid Customers</span>
              </div>
              <p className="text-3xl font-bold text-theme-primary">{stats.paidCustomers}</p>
            </div>
            <div className="card-theme rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Store className="w-5 h-5 text-purple-400" />
                <span className="text-theme-muted text-sm">Plan Breakdown</span>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-gray-500/20 text-gray-400">F: {stats.planBreakdown.free}</span>
                <span className="px-2 py-1 rounded bg-green-500/20 text-green-400">S: {stats.planBreakdown.starter}</span>
                <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400">P: {stats.planBreakdown.pro}</span>
                <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-400">B: {stats.planBreakdown.business}</span>
              </div>
            </div>
          </div>
        )}

        {/* Sort Controls */}
        <div className="flex items-center gap-4 mb-4">
          <span className="text-theme-muted text-sm">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-theme-input border border-theme-secondary rounded-lg px-3 py-1.5 text-theme-primary text-sm"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="plan">Plan (Highest)</option>
          </select>
        </div>

        {/* Customer List */}
        <div className="space-y-3">
          {sortedCustomers.map((customer) => (
            <div key={customer.id} className="card-theme rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedCustomer(expandedCustomer === customer.id ? null : customer.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-theme-secondary/10 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-theme-accent/20 flex items-center justify-center">
                    <span className="text-theme-accent font-semibold">
                      {customer.name?.charAt(0).toUpperCase() || customer.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-theme-primary">{customer.name || 'No name'}</span>
                      {customer.emailVerified && (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                    <span className="text-theme-muted text-sm">{customer.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPlanBadgeColor(customer.plan)}`}>
                    {customer.plan.charAt(0).toUpperCase() + customer.plan.slice(1)}
                  </span>
                  <span className="text-theme-muted text-sm hidden sm:block">
                    {formatRelativeTime(customer.daysSinceSignup)}
                  </span>
                  {expandedCustomer === customer.id ? (
                    <ChevronUp className="w-5 h-5 text-theme-muted" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-theme-muted" />
                  )}
                </div>
              </button>

              {expandedCustomer === customer.id && (
                <div className="px-4 pb-4 border-t border-theme-secondary/50 pt-4">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-theme-muted text-xs mb-1">
                        <Calendar className="w-3 h-3" />
                        Signed Up
                      </div>
                      <p className="text-theme-primary text-sm">{formatDate(customer.createdAt)}</p>
                      <p className="text-theme-muted text-xs">{customer.daysSinceSignup} days ago</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-theme-muted text-xs mb-1">
                        <CreditCard className="w-3 h-3" />
                        Subscription
                      </div>
                      <p className="text-theme-primary text-sm capitalize">
                        {customer.subscriptionStatus || 'No subscription'}
                      </p>
                      {customer.renewsAt && (
                        <p className="text-theme-muted text-xs">
                          {customer.cancelAtPeriodEnd ? 'Cancels' : 'Renews'}: {formatDate(customer.renewsAt)}
                        </p>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-theme-muted text-xs mb-1">
                        <Store className="w-3 h-3" />
                        Integrations
                      </div>
                      {customer.platforms.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {customer.platforms.map((p, i) => (
                            <span key={i} className="px-2 py-0.5 bg-theme-accent/20 text-theme-accent rounded text-xs">
                              {p.platform}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-theme-muted text-sm">None connected</p>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-theme-muted text-xs mb-1">
                        <ShoppingCart className="w-3 h-3" />
                        Transactions
                      </div>
                      <p className="text-theme-primary text-sm">{customer.transactionCount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {sortedCustomers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-theme-muted mx-auto mb-4" />
              <p className="text-theme-muted">No customers yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

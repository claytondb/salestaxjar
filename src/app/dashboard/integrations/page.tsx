'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PlatformsManager from '@/components/PlatformsManager';
import { Link2, Package, Clock } from 'lucide-react';

interface IntegrationStats {
  connectedPlatforms: number;
  totalOrdersSynced: number;
  lastSyncAt: string | null;
}

export default function IntegrationsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<IntegrationStats>({
    connectedPlatforms: 0,
    totalOrdersSynced: 0,
    lastSyncAt: null,
  });

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/platforms');
      if (response.ok) {
        const data = await response.json();
        
        // Count connected platforms
        const connectedCount = data.platforms?.reduce(
          (acc: number, p: { connectedCount?: number }) => acc + (p.connectedCount || 0),
          0
        ) || 0;
        
        // Find most recent sync
        let lastSync: string | null = null;
        data.platforms?.forEach((p: { connections?: Array<{ lastSyncAt?: string }> }) => {
          p.connections?.forEach((c: { lastSyncAt?: string }) => {
            if (c.lastSyncAt && (!lastSync || new Date(c.lastSyncAt) > new Date(lastSync))) {
              lastSync = c.lastSyncAt;
            }
          });
        });
        
        setStats({
          connectedPlatforms: connectedCount,
          totalOrdersSynced: 0, // Would need separate API call
          lastSyncAt: lastSync,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login?redirect=/dashboard/integrations');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, fetchStats]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-theme-gradient flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-theme-accent"></div>
      </div>
    );
  }

  const formatLastSync = (date: string | null) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-theme-gradient">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-theme-primary mb-2">Platform Integrations</h1>
          <p className="text-theme-muted">
            Connect your e-commerce platforms to automatically import orders and track sales tax obligations.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-theme-secondary/30 backdrop-blur rounded-xl border border-theme-primary p-4">
            <div className="flex items-center gap-2 text-theme-muted text-sm mb-1">
              <Link2 className="w-4 h-4" />
              Connected Platforms
            </div>
            <div className="text-2xl font-bold text-theme-accent">{stats.connectedPlatforms}</div>
          </div>
          <div className="bg-theme-secondary/30 backdrop-blur rounded-xl border border-theme-primary p-4">
            <div className="flex items-center gap-2 text-theme-muted text-sm mb-1">
              <Package className="w-4 h-4" />
              Orders Synced
            </div>
            <div className="text-2xl font-bold text-theme-primary">
              {stats.totalOrdersSynced > 0 ? stats.totalOrdersSynced.toLocaleString() : '—'}
            </div>
          </div>
          <div className="bg-theme-secondary/30 backdrop-blur rounded-xl border border-theme-primary p-4">
            <div className="flex items-center gap-2 text-theme-muted text-sm mb-1">
              <Clock className="w-4 h-4" />
              Last Sync
            </div>
            <div className="text-2xl font-bold text-theme-primary">{formatLastSync(stats.lastSyncAt)}</div>
          </div>
        </div>

        {/* Platforms Manager */}
        <PlatformsManager />
      </main>

      <Footer />
    </div>
  );
}

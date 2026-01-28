'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingCart, 
  Package, 
  Palette, 
  Plug, 
  Store, 
  Tag, 
  Square,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Check,
  Loader2,
  Unplug,
  Upload,
  Clock
} from 'lucide-react';
import { AmazonManualImport } from './AmazonManualImport';

interface PlatformConnection {
  id: string;
  platform: string;
  platformId: string;
  platformName: string | null;
  connected: boolean;
  lastSyncAt: string | null;
  syncStatus: string;
  syncError: string | null;
}

interface PlatformConfig {
  platform: string;
  name: string;
  configured: boolean;
  description: string;
  features: string[];
  setupUrl?: string;
  connections: PlatformConnection[];
  connectedCount: number;
}

interface PlatformsResponse {
  platforms: PlatformConfig[];
  totalConnections: number;
}

const platformIcons: Record<string, React.ReactNode> = {
  shopify: <ShoppingCart className="w-6 h-6" />,
  amazon: <Package className="w-6 h-6" />,
  etsy: <Palette className="w-6 h-6" />,
  woocommerce: <Plug className="w-6 h-6" />,
  bigcommerce: <Store className="w-6 h-6" />,
  ebay: <Tag className="w-6 h-6" />,
  square: <Square className="w-6 h-6" />,
};

export default function PlatformsManager() {
  const [platforms, setPlatforms] = useState<PlatformConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [syncingConnection, setSyncingConnection] = useState<string | null>(null);
  const [shopifyShop, setShopifyShop] = useState('');
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [showAmazonModal, setShowAmazonModal] = useState(false);

  const fetchPlatforms = useCallback(async () => {
    try {
      const response = await fetch('/api/platforms');
      if (!response.ok) throw new Error('Failed to fetch platforms');
      const data: PlatformsResponse = await response.json();
      setPlatforms(data.platforms);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load platforms');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  const handleConnect = async (platform: string) => {
    if (platform === 'shopify') {
      setShowShopifyModal(true);
      return;
    }

    if (platform === 'amazon') {
      setShowAmazonModal(true);
      return;
    }
    
    // For other platforms, redirect to their OAuth flow
    setConnectingPlatform(platform);
    try {
      window.location.href = `/api/platforms/${platform}/auth`;
    } catch (err) {
      setError(`Failed to connect to ${platform}`);
      setConnectingPlatform(null);
    }
  };

  const handleShopifyConnect = () => {
    if (!shopifyShop.trim()) return;
    
    setConnectingPlatform('shopify');
    const shop = shopifyShop.includes('.myshopify.com') 
      ? shopifyShop 
      : `${shopifyShop}.myshopify.com`;
    window.location.href = `/api/platforms/shopify/auth?shop=${encodeURIComponent(shop)}`;
  };

  const handleDisconnect = async (platform: string, platformId: string, platformName: string) => {
    if (!confirm(`Are you sure you want to disconnect ${platformName || platform}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/platforms', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, platformId }),
      });

      if (!response.ok) throw new Error('Failed to disconnect platform');
      
      // Refresh the list
      await fetchPlatforms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  };

  const handleSync = async (platform: string, platformId: string) => {
    setSyncingConnection(`${platform}-${platformId}`);
    
    try {
      const response = await fetch('/api/platforms/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, platformId }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      // Refresh to show updated sync status
      await fetchPlatforms();
      
      alert(`Sync complete! Imported ${data.imported} orders.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncingConnection(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur rounded-xl border border-white/10 p-6">
        <h2 className="text-xl font-semibold text-white mb-2">Connected Platforms</h2>
        <p className="text-gray-400">
          Connect your sales channels to automatically import transactions and calculate sales tax obligations.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Platform List */}
      <div className="space-y-4">
        {platforms.map((platform) => (
          <div 
            key={platform.platform}
            className="bg-white/10 backdrop-blur rounded-xl border border-white/10 overflow-hidden"
          >
            {/* Platform Header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  platform.configured ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-gray-400'
                }`}>
                  {platformIcons[platform.platform] || <Package className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-medium text-white flex items-center gap-2">
                    {platform.name}
                    {platform.platform === 'amazon' && (
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Direct API Coming Soon
                      </span>
                    )}
                    {platform.connectedCount > 0 && (
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                        {platform.connectedCount} connected
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-400">{platform.description}</p>
                </div>
              </div>
              
              {platform.platform === 'amazon' ? (
                <button
                  onClick={() => setShowAmazonModal(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Import Data
                </button>
              ) : platform.configured ? (
                <button
                  onClick={() => handleConnect(platform.platform)}
                  disabled={connectingPlatform === platform.platform}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2"
                >
                  {connectingPlatform === platform.platform ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>Connect {platform.connectedCount > 0 ? 'Another' : ''}</>
                  )}
                </button>
              ) : (
                <div className="text-right">
                  <span className="text-gray-500 text-sm block mb-1">Not configured</span>
                  {platform.setupUrl && (
                    <a 
                      href={platform.setupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 text-sm flex items-center gap-1"
                    >
                      Setup Guide <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Connected Stores */}
            {platform.connections.length > 0 && (
              <div className="border-t border-white/10">
                {platform.connections.map((conn) => (
                  <div 
                    key={conn.id}
                    className="p-4 flex items-center justify-between bg-emerald-500/5 border-b border-white/5 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        conn.syncStatus === 'success' ? 'bg-emerald-400' :
                        conn.syncStatus === 'error' ? 'bg-red-400' :
                        conn.syncStatus === 'syncing' ? 'bg-yellow-400 animate-pulse' :
                        'bg-gray-400'
                      }`} />
                      <div>
                        <p className="text-white font-medium">
                          {conn.platformName || conn.platformId}
                        </p>
                        <p className="text-sm text-gray-400">
                          {conn.syncStatus === 'syncing' ? (
                            'Syncing...'
                          ) : conn.syncStatus === 'error' ? (
                            <span className="text-red-400">{conn.syncError || 'Sync error'}</span>
                          ) : conn.lastSyncAt ? (
                            `Last sync: ${new Date(conn.lastSyncAt).toLocaleDateString()} at ${new Date(conn.lastSyncAt).toLocaleTimeString()}`
                          ) : (
                            'Never synced'
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSync(conn.platform, conn.platformId)}
                        disabled={syncingConnection === `${conn.platform}-${conn.platformId}`}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition disabled:opacity-50"
                        title="Sync now"
                      >
                        {syncingConnection === `${conn.platform}-${conn.platformId}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDisconnect(conn.platform, conn.platformId, conn.platformName || '')}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                        title="Disconnect"
                      >
                        <Unplug className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Features */}
            {platform.features.length > 0 && (
              <div className="px-4 py-3 bg-white/5 border-t border-white/10">
                <div className="flex flex-wrap gap-2">
                  {platform.features.map((feature, i) => (
                    <span 
                      key={i}
                      className="px-2 py-1 bg-white/10 text-gray-300 text-xs rounded"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Help Section */}
      <div className="bg-white/10 backdrop-blur rounded-xl border border-white/10 p-6">
        <h3 className="font-medium text-white mb-2">Need help connecting?</h3>
        <p className="text-gray-400 text-sm mb-4">
          Check our integration guides or contact support if you&apos;re having trouble connecting your platforms.
        </p>
        <div className="flex gap-3">
          <a 
            href="/docs/integrations"
            className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
          >
            View Integration Docs →
          </a>
          <a 
            href="mailto:support@sails.tax"
            className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
          >
            Contact Support →
          </a>
        </div>
      </div>

      {/* Shopify Modal */}
      {showShopifyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl border border-white/20 p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-white mb-2">Connect Shopify Store</h3>
            <p className="text-gray-400 text-sm mb-4">
              Enter your Shopify store domain to connect your store.
            </p>
            
            <div className="mb-4">
              <label className="block text-gray-300 text-sm mb-2">Store Domain</label>
              <div className="flex">
                <input
                  type="text"
                  value={shopifyShop}
                  onChange={(e) => setShopifyShop(e.target.value)}
                  placeholder="your-store"
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-l-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="px-3 py-3 bg-white/5 border border-l-0 border-white/20 rounded-r-lg text-gray-400">
                  .myshopify.com
                </span>
              </div>
              <p className="text-gray-500 text-xs mt-1">
                Or enter your full store URL (e.g., your-store.myshopify.com)
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowShopifyModal(false);
                  setShopifyShop('');
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleShopifyConnect}
                disabled={!shopifyShop.trim() || connectingPlatform === 'shopify'}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {connectingPlatform === 'shopify' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect Store'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Amazon Manual Import Modal */}
      {showAmazonModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-white/20 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Package className="w-6 h-6 text-orange-400" />
                  Amazon Seller Central
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  Import your Amazon sales tax data manually
                </p>
              </div>
              <button
                onClick={() => setShowAmazonModal(false)}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
              >
                ✕
              </button>
            </div>
            
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
              <p className="text-yellow-400 text-sm">
                <strong>Direct API integration coming soon!</strong> For now, you can import your Amazon tax reports manually. 
                This gives you the same data - just requires a few extra clicks.
              </p>
            </div>
            
            <AmazonManualImport />
          </div>
        </div>
      )}
    </div>
  );
}

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
// Platform integrations focused on own-website sellers (not marketplace facilitators)

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
  woocommerce: <Plug className="w-6 h-6" />,
  squarespace: <Square className="w-6 h-6" />,
  bigcommerce: <Store className="w-6 h-6" />,
  wix: <Palette className="w-6 h-6" />,
};

export default function PlatformsManager() {
  const [platforms, setPlatforms] = useState<PlatformConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [syncingConnection, setSyncingConnection] = useState<string | null>(null);
  
  // Shopify modal state
  const [shopifyShop, setShopifyShop] = useState('');
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  
  // WooCommerce modal state
  const [showWooCommerceModal, setShowWooCommerceModal] = useState(false);
  const [wooStoreUrl, setWooStoreUrl] = useState('');
  const [wooConsumerKey, setWooConsumerKey] = useState('');
  const [wooConsumerSecret, setWooConsumerSecret] = useState('');
  const [wooConnectError, setWooConnectError] = useState<string | null>(null);
  
  // Squarespace modal state
  const [showSquarespaceModal, setShowSquarespaceModal] = useState(false);
  const [squarespaceApiKey, setSquarespaceApiKey] = useState('');
  const [squarespaceStoreName, setSquarespaceStoreName] = useState('');
  const [squarespaceConnectError, setSquarespaceConnectError] = useState<string | null>(null);

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

    if (platform === 'woocommerce') {
      setShowWooCommerceModal(true);
      return;
    }

    if (platform === 'squarespace') {
      setShowSquarespaceModal(true);
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

  const handleWooCommerceConnect = async () => {
    if (!wooStoreUrl.trim() || !wooConsumerKey.trim() || !wooConsumerSecret.trim()) {
      setWooConnectError('Please fill in all fields');
      return;
    }

    setConnectingPlatform('woocommerce');
    setWooConnectError(null);

    try {
      const response = await fetch('/api/platforms/woocommerce/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeUrl: wooStoreUrl,
          consumerKey: wooConsumerKey,
          consumerSecret: wooConsumerSecret,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setWooConnectError(data.error || 'Failed to connect');
        setConnectingPlatform(null);
        return;
      }

      // Success - close modal and refresh
      setShowWooCommerceModal(false);
      setWooStoreUrl('');
      setWooConsumerKey('');
      setWooConsumerSecret('');
      setConnectingPlatform(null);
      await fetchPlatforms();
      
      // Show success message
      alert(`Successfully connected to ${data.store?.name || 'WooCommerce store'}!`);
    } catch (err) {
      setWooConnectError(err instanceof Error ? err.message : 'Connection failed');
      setConnectingPlatform(null);
    }
  };

  const handleSquarespaceConnect = async () => {
    if (!squarespaceApiKey.trim()) {
      setSquarespaceConnectError('Please enter your API key');
      return;
    }

    setConnectingPlatform('squarespace');
    setSquarespaceConnectError(null);

    try {
      const response = await fetch('/api/platforms/squarespace/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: squarespaceApiKey,
          storeName: squarespaceStoreName || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSquarespaceConnectError(data.error || 'Failed to connect');
        setConnectingPlatform(null);
        return;
      }

      // Success - close modal and refresh
      setShowSquarespaceModal(false);
      setSquarespaceApiKey('');
      setSquarespaceStoreName('');
      setConnectingPlatform(null);
      await fetchPlatforms();
      
      // Show success message
      alert(`Successfully connected to ${data.store?.name || 'Squarespace store'}!`);
    } catch (err) {
      setSquarespaceConnectError(err instanceof Error ? err.message : 'Connection failed');
      setConnectingPlatform(null);
    }
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
      <div className="bg-theme-secondary/30 backdrop-blur rounded-xl border border-theme-primary p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-theme-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-theme-secondary/30 backdrop-blur rounded-xl border border-theme-primary p-6">
        <h2 className="text-xl font-semibold text-theme-primary mb-2">Connected Platforms</h2>
        <p className="text-theme-muted">
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
            className="bg-theme-secondary/30 backdrop-blur rounded-xl border border-theme-primary overflow-hidden"
          >
            {/* Platform Header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  platform.configured ? 'btn-theme-primary/20 text-theme-accent' : 'bg-theme-secondary/30 text-theme-muted'
                }`}>
                  {platformIcons[platform.platform] || <Package className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-medium text-theme-primary flex items-center gap-2">
                    {platform.name}
                    {platform.connectedCount > 0 && (
                      <span className="px-2 py-0.5 btn-theme-primary/20 text-theme-accent text-xs rounded-full">
                        {platform.connectedCount} connected
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-theme-muted">{platform.description}</p>
                </div>
              </div>
              
              {platform.configured ? (
                <button
                  onClick={() => handleConnect(platform.platform)}
                  disabled={connectingPlatform === platform.platform}
                  className="btn-theme-primary  text-theme-primary px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2"
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
                  <span className="text-theme-muted text-sm block mb-1">Not configured</span>
                  {platform.setupUrl && (
                    <a 
                      href={platform.setupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-theme-accent hover:text-emerald-300 text-sm flex items-center gap-1"
                    >
                      Setup Guide <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Connected Stores */}
            {platform.connections.length > 0 && (
              <div className="border-t border-theme-primary">
                {platform.connections.map((conn) => (
                  <div 
                    key={conn.id}
                    className="p-4 flex items-center justify-between btn-theme-primary/5 border-b border-white/5 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        conn.syncStatus === 'success' ? 'bg-emerald-400' :
                        conn.syncStatus === 'error' ? 'bg-red-400' :
                        conn.syncStatus === 'syncing' ? 'bg-yellow-400 animate-pulse' :
                        'bg-gray-400'
                      }`} />
                      <div>
                        <p className="text-theme-primary font-medium">
                          {conn.platformName || conn.platformId}
                        </p>
                        <p className="text-sm text-theme-muted">
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
                        className="p-2 bg-theme-secondary/30 hover:bg-white/20 text-theme-primary rounded-lg transition disabled:opacity-50"
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
              <div className="px-4 py-3 bg-theme-secondary/20 border-t border-theme-primary">
                <div className="flex flex-wrap gap-2">
                  {platform.features.map((feature, i) => (
                    <span 
                      key={i}
                      className="px-2 py-1 bg-theme-secondary/30 text-theme-secondary text-xs rounded"
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
      <div className="bg-theme-secondary/30 backdrop-blur rounded-xl border border-theme-primary p-6">
        <h3 className="font-medium text-theme-primary mb-2">Need help connecting?</h3>
        <p className="text-theme-muted text-sm mb-4">
          Check our integration guides or contact support if you&apos;re having trouble connecting your platforms.
        </p>
        <div className="flex gap-3">
          <a 
            href="/docs/integrations"
            className="text-theme-accent hover:text-emerald-300 text-sm font-medium"
          >
            View Integration Docs →
          </a>
          <a 
            href="mailto:support@sails.tax"
            className="text-theme-accent hover:text-emerald-300 text-sm font-medium"
          >
            Contact Support →
          </a>
        </div>
      </div>

      {/* Shopify Modal */}
      {showShopifyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl border border-theme-secondary p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-theme-primary mb-2">Connect Shopify Store</h3>
            <p className="text-theme-muted text-sm mb-4">
              Enter your Shopify store domain to connect your store.
            </p>
            
            <div className="mb-4">
              <label className="block text-theme-secondary text-sm mb-2">Store Domain</label>
              <div className="flex">
                <input
                  type="text"
                  value={shopifyShop}
                  onChange={(e) => setShopifyShop(e.target.value)}
                  placeholder="your-store"
                  className="flex-1 px-4 py-3 bg-theme-secondary/30 border border-theme-secondary rounded-l-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="px-3 py-3 bg-theme-secondary/20 border border-l-0 border-theme-secondary rounded-r-lg text-theme-muted">
                  .myshopify.com
                </span>
              </div>
              <p className="text-theme-muted text-xs mt-1">
                Or enter your full store URL (e.g., your-store.myshopify.com)
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowShopifyModal(false);
                  setShopifyShop('');
                }}
                className="px-4 py-2 bg-theme-secondary/30 hover:bg-white/20 text-theme-primary rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleShopifyConnect}
                disabled={!shopifyShop.trim() || connectingPlatform === 'shopify'}
                className="flex-1 btn-theme-primary  text-theme-primary px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
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

      {/* WooCommerce API Keys Modal */}
      {showWooCommerceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-theme-secondary p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-theme-primary flex items-center gap-2">
                  <Plug className="w-6 h-6 text-theme-accent" />
                  Connect WooCommerce
                </h3>
                <p className="text-theme-muted text-sm mt-1">
                  Enter your store URL and REST API keys
                </p>
              </div>
              <button
                onClick={() => {
                  setShowWooCommerceModal(false);
                  setWooConnectError(null);
                }}
                className="p-2 bg-theme-secondary/30 hover:bg-white/20 text-theme-primary rounded-lg transition"
              >
                ✕
              </button>
            </div>
            
            <div className="bg-accent-subtle border border-theme-accent/30 rounded-lg p-3 mb-4">
              <p className="text-theme-accent text-sm">
                <strong>How to get API keys:</strong> In WooCommerce, go to Settings → Advanced → REST API → Add Key. 
                Give it <strong>Read</strong> access and copy the Consumer Key and Secret.
              </p>
            </div>

            {wooConnectError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{wooConnectError}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-theme-secondary text-sm mb-2">Store URL</label>
                <input
                  type="text"
                  value={wooStoreUrl}
                  onChange={(e) => setWooStoreUrl(e.target.value)}
                  placeholder="https://your-store.com"
                  className="w-full px-4 py-3 bg-theme-secondary/30 border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-theme-secondary text-sm mb-2">Consumer Key</label>
                <input
                  type="text"
                  value={wooConsumerKey}
                  onChange={(e) => setWooConsumerKey(e.target.value)}
                  placeholder="ck_..."
                  className="w-full px-4 py-3 bg-theme-secondary/30 border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-theme-secondary text-sm mb-2">Consumer Secret</label>
                <input
                  type="password"
                  value={wooConsumerSecret}
                  onChange={(e) => setWooConsumerSecret(e.target.value)}
                  placeholder="cs_..."
                  className="w-full px-4 py-3 bg-theme-secondary/30 border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowWooCommerceModal(false);
                  setWooStoreUrl('');
                  setWooConsumerKey('');
                  setWooConsumerSecret('');
                  setWooConnectError(null);
                }}
                className="px-4 py-2 bg-theme-secondary/30 hover:bg-white/20 text-theme-primary rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleWooCommerceConnect}
                disabled={!wooStoreUrl.trim() || !wooConsumerKey.trim() || !wooConsumerSecret.trim() || connectingPlatform === 'woocommerce'}
                className="flex-1 btn-theme-primary text-theme-primary px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {connectingPlatform === 'woocommerce' ? (
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

      {/* Squarespace API Key Modal */}
      {showSquarespaceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-theme-secondary p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-theme-primary flex items-center gap-2">
                  <Square className="w-6 h-6 text-theme-accent" />
                  Connect Squarespace
                </h3>
                <p className="text-theme-muted text-sm mt-1">
                  Enter your Commerce API key
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSquarespaceModal(false);
                  setSquarespaceConnectError(null);
                }}
                className="p-2 bg-theme-secondary/30 hover:bg-white/20 text-theme-primary rounded-lg transition"
              >
                ✕
              </button>
            </div>
            
            <div className="bg-accent-subtle border border-theme-accent/30 rounded-lg p-3 mb-4">
              <p className="text-theme-accent text-sm">
                <strong>How to get an API key:</strong> In Squarespace, go to Settings → Advanced → Developer API Keys → Generate Key. 
                Select <strong>Orders API (Read)</strong> permission.
              </p>
              <p className="text-theme-accent/70 text-xs mt-2">
                Note: Requires Commerce Advanced plan.
              </p>
            </div>

            {squarespaceConnectError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{squarespaceConnectError}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-theme-secondary text-sm mb-2">API Key</label>
                <input
                  type="password"
                  value={squarespaceApiKey}
                  onChange={(e) => setSquarespaceApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="w-full px-4 py-3 bg-theme-secondary/30 border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-theme-secondary text-sm mb-2">Store Name (optional)</label>
                <input
                  type="text"
                  value={squarespaceStoreName}
                  onChange={(e) => setSquarespaceStoreName(e.target.value)}
                  placeholder="My Squarespace Store"
                  className="w-full px-4 py-3 bg-theme-secondary/30 border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowSquarespaceModal(false);
                  setSquarespaceApiKey('');
                  setSquarespaceStoreName('');
                  setSquarespaceConnectError(null);
                }}
                className="px-4 py-2 bg-theme-secondary/30 hover:bg-white/20 text-theme-primary rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSquarespaceConnect}
                disabled={!squarespaceApiKey.trim() || connectingPlatform === 'squarespace'}
                className="flex-1 btn-theme-primary text-theme-primary px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {connectingPlatform === 'squarespace' ? (
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
    </div>
  );
}

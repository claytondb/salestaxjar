'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  Plug,
  Store,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Check,
  Loader2,
  Unplug,
  Upload,
  Clock,
  Download
} from 'lucide-react';
import { platformLogos } from './PlatformLogos';
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
  comingSoon?: boolean;
  connections: PlatformConnection[];
  connectedCount: number;
}

interface PlatformsResponse {
  platforms: PlatformConfig[];
  totalConnections: number;
}

// Platform logos - uses actual brand logos
const getPlatformLogo = (platform: string) => {
  const LogoComponent = platformLogos[platform];
  if (LogoComponent) {
    return <LogoComponent className="w-6 h-6" />;
  }
  return <Package className="w-6 h-6" />;
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
  
  // BigCommerce modal state
  const [showBigCommerceModal, setShowBigCommerceModal] = useState(false);
  const [bigCommerceStoreHash, setBigCommerceStoreHash] = useState('');
  const [bigCommerceAccessToken, setBigCommerceAccessToken] = useState('');
  const [bigCommerceConnectError, setBigCommerceConnectError] = useState<string | null>(null);
  
  // Magento modal state
  const [showMagentoModal, setShowMagentoModal] = useState(false);
  const [magentoStoreUrl, setMagentoStoreUrl] = useState('');
  const [magentoAccessToken, setMagentoAccessToken] = useState('');
  const [magentoConnectError, setMagentoConnectError] = useState<string | null>(null);
  
  // PrestaShop modal state
  const [showPrestaShopModal, setShowPrestaShopModal] = useState(false);
  const [prestaShopStoreUrl, setPrestaShopStoreUrl] = useState('');
  const [prestaShopApiKey, setPrestaShopApiKey] = useState('');
  const [prestaShopConnectError, setPrestaShopConnectError] = useState<string | null>(null);
  
  // OpenCart modal state
  const [showOpenCartModal, setShowOpenCartModal] = useState(false);
  const [openCartStoreUrl, setOpenCartStoreUrl] = useState('');
  const [openCartApiUsername, setOpenCartApiUsername] = useState('');
  const [openCartApiKey, setOpenCartApiKey] = useState('');
  const [openCartConnectError, setOpenCartConnectError] = useState<string | null>(null);
  
  // Ecwid modal state
  const [showEcwidModal, setShowEcwidModal] = useState(false);
  const [ecwidStoreId, setEcwidStoreId] = useState('');
  const [ecwidApiToken, setEcwidApiToken] = useState('');
  const [ecwidConnectError, setEcwidConnectError] = useState<string | null>(null);
  
  // Squarespace modal state
  const [showSquarespaceModal, setShowSquarespaceModal] = useState(false);
  const [squarespaceApiKey, setSquarespaceApiKey] = useState('');
  const [squarespaceStoreName, setSquarespaceStoreName] = useState('');
  const [squarespaceConnectError, setSquarespaceConnectError] = useState<string | null>(null);
  
  // Platform request modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestedPlatform, setRequestedPlatform] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

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

    if (platform === 'bigcommerce') {
      setShowBigCommerceModal(true);
      return;
    }

    if (platform === 'magento') {
      setShowMagentoModal(true);
      return;
    }

    if (platform === 'prestashop') {
      setShowPrestaShopModal(true);
      return;
    }

    if (platform === 'opencart') {
      setShowOpenCartModal(true);
      return;
    }

    if (platform === 'ecwid') {
      setShowEcwidModal(true);
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

  const handleBigCommerceConnect = async () => {
    if (!bigCommerceStoreHash.trim() || !bigCommerceAccessToken.trim()) {
      setBigCommerceConnectError('Please fill in all fields');
      return;
    }

    setConnectingPlatform('bigcommerce');
    setBigCommerceConnectError(null);

    try {
      const response = await fetch('/api/platforms/bigcommerce/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeHash: bigCommerceStoreHash,
          accessToken: bigCommerceAccessToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setBigCommerceConnectError(data.error || 'Failed to connect');
        setConnectingPlatform(null);
        return;
      }

      // Success - close modal and refresh
      setShowBigCommerceModal(false);
      setBigCommerceStoreHash('');
      setBigCommerceAccessToken('');
      setConnectingPlatform(null);
      await fetchPlatforms();
      
      // Show success message
      alert(`Successfully connected to ${data.store?.name || 'BigCommerce store'}!`);
    } catch (err) {
      setBigCommerceConnectError(err instanceof Error ? err.message : 'Connection failed');
      setConnectingPlatform(null);
    }
  };

  const handleMagentoConnect = async () => {
    if (!magentoStoreUrl.trim() || !magentoAccessToken.trim()) {
      setMagentoConnectError('Please fill in all fields');
      return;
    }

    setConnectingPlatform('magento');
    setMagentoConnectError(null);

    try {
      const response = await fetch('/api/platforms/magento/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeUrl: magentoStoreUrl,
          accessToken: magentoAccessToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMagentoConnectError(data.error || 'Failed to connect');
        setConnectingPlatform(null);
        return;
      }

      // Success - close modal and refresh
      setShowMagentoModal(false);
      setMagentoStoreUrl('');
      setMagentoAccessToken('');
      setConnectingPlatform(null);
      await fetchPlatforms();
      
      // Show success message
      alert(`Successfully connected to ${data.store?.name || 'Magento store'}!`);
    } catch (err) {
      setMagentoConnectError(err instanceof Error ? err.message : 'Connection failed');
      setConnectingPlatform(null);
    }
  };

  const handlePrestaShopConnect = async () => {
    if (!prestaShopStoreUrl.trim() || !prestaShopApiKey.trim()) {
      setPrestaShopConnectError('Please fill in all fields');
      return;
    }

    setConnectingPlatform('prestashop');
    setPrestaShopConnectError(null);

    try {
      const response = await fetch('/api/platforms/prestashop/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeUrl: prestaShopStoreUrl,
          apiKey: prestaShopApiKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPrestaShopConnectError(data.error || 'Failed to connect');
        setConnectingPlatform(null);
        return;
      }

      // Success - close modal and refresh
      setShowPrestaShopModal(false);
      setPrestaShopStoreUrl('');
      setPrestaShopApiKey('');
      setConnectingPlatform(null);
      await fetchPlatforms();
      
      // Show success message
      alert(`Successfully connected to ${data.store?.name || 'PrestaShop store'}!`);
    } catch (err) {
      setPrestaShopConnectError(err instanceof Error ? err.message : 'Connection failed');
      setConnectingPlatform(null);
    }
  };

  const handleOpenCartConnect = async () => {
    if (!openCartStoreUrl.trim() || !openCartApiUsername.trim() || !openCartApiKey.trim()) {
      setOpenCartConnectError('Please fill in all fields');
      return;
    }

    setConnectingPlatform('opencart');
    setOpenCartConnectError(null);

    try {
      const response = await fetch('/api/platforms/opencart/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeUrl: openCartStoreUrl,
          apiUsername: openCartApiUsername,
          apiKey: openCartApiKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOpenCartConnectError(data.error || 'Failed to connect');
        setConnectingPlatform(null);
        return;
      }

      // Success - close modal and refresh
      setShowOpenCartModal(false);
      setOpenCartStoreUrl('');
      setOpenCartApiUsername('');
      setOpenCartApiKey('');
      setConnectingPlatform(null);
      await fetchPlatforms();
      
      // Show success message
      alert(`Successfully connected to ${data.store?.name || 'OpenCart store'}!`);
    } catch (err) {
      setOpenCartConnectError(err instanceof Error ? err.message : 'Connection failed');
      setConnectingPlatform(null);
    }
  };

  const handleEcwidConnect = async () => {
    if (!ecwidStoreId.trim() || !ecwidApiToken.trim()) {
      setEcwidConnectError('Please fill in all fields');
      return;
    }

    setConnectingPlatform('ecwid');
    setEcwidConnectError(null);

    try {
      const response = await fetch('/api/platforms/ecwid/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: ecwidStoreId,
          apiToken: ecwidApiToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setEcwidConnectError(data.error || 'Failed to connect');
        setConnectingPlatform(null);
        return;
      }

      // Success - close modal and refresh
      setShowEcwidModal(false);
      setEcwidStoreId('');
      setEcwidApiToken('');
      setConnectingPlatform(null);
      await fetchPlatforms();
      
      // Show success message
      alert(`Successfully connected to ${data.store?.name || 'Ecwid store'}!`);
    } catch (err) {
      setEcwidConnectError(err instanceof Error ? err.message : 'Connection failed');
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

  const handlePlatformRequest = async () => {
    if (!requestedPlatform.trim()) return;

    setRequestSubmitting(true);

    try {
      const response = await fetch('/api/platforms/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: requestedPlatform,
        }),
      });

      if (response.ok) {
        setRequestSuccess(true);
        setTimeout(() => {
          setShowRequestModal(false);
          setRequestedPlatform('');
          setRequestSuccess(false);
        }, 2000);
      } else {
        setError('Failed to submit request. Please try again.');
      }
    } catch {
      setError('Failed to submit request. Please try again.');
    } finally {
      setRequestSubmitting(false);
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
        <div className="rounded-lg p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--error-bg)', border: '1px solid var(--error-border)' }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--error-text)' }} />
          <p style={{ color: 'var(--error-text)' }}>{error}</p>
          <button 
            onClick={() => setError(null)}
            className="ml-auto hover:opacity-70"
            style={{ color: 'var(--error-text)' }}
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
                  platform.configured ? 'bg-theme-secondary/30' : 'bg-theme-secondary/30 text-theme-muted'
                }`}>
                  {getPlatformLogo(platform.platform)}
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
              
              {platform.comingSoon ? (
                <span className="px-4 py-2 bg-theme-secondary/50 text-theme-muted rounded-lg font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Coming Soon
                </span>
              ) : platform.configured ? (
                <div className="flex items-center gap-2">
                  {/* Show Get Plugin link for WooCommerce */}
                  {platform.platform === 'woocommerce' && (
                    <a
                      href="/dashboard/integrations/woocommerce"
                      className="px-4 py-2 bg-white text-theme-accent rounded-lg font-medium transition hover:bg-gray-100 flex items-center gap-2 whitespace-nowrap"
                    >
                      <Download className="w-4 h-4" />
                      Get Plugin
                    </a>
                  )}
                  <button
                    onClick={() => handleConnect(platform.platform)}
                    disabled={connectingPlatform === platform.platform}
                    className="btn-theme-primary text-theme-primary px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2"
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
                </div>
              ) : (
                <div className="text-right">
                  <span className="text-theme-muted text-sm block mb-1">Not configured</span>
                  {platform.setupUrl && (
                    <a 
                      href={platform.setupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-theme-accent hover:opacity-80 text-sm flex items-center gap-1"
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
                            <span style={{ color: 'var(--error-text)' }}>{conn.syncError || 'Sync error'}</span>
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
                        className="p-2 rounded-lg transition hover:opacity-80"
                        style={{ backgroundColor: 'var(--error-bg)', color: 'var(--error-text)' }}
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
            className="text-theme-accent hover:opacity-80 text-sm font-medium"
          >
            View Integration Docs →
          </a>
          <a 
            href="mailto:support@sails.tax"
            className="text-theme-accent hover:opacity-80 text-sm font-medium"
          >
            Contact Support →
          </a>
        </div>
      </div>

      {/* Request Platform Section */}
      <div className="card-theme rounded-xl p-6 text-center">
        <h3 className="font-medium text-theme-primary mb-2">Don&apos;t see the platform you need?</h3>
        <p className="text-theme-muted text-sm mb-4">
          Let us know which platform you&apos;d like us to support next.
        </p>
        <button
          onClick={() => setShowRequestModal(true)}
          className="btn-theme-primary px-6 py-2 rounded-lg font-medium transition"
        >
          Request Platform Integration
        </button>
      </div>

      {/* Shopify Modal */}
      {showShopifyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card-theme rounded-xl p-6 max-w-md w-full mx-4">
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
          <div className="card-theme rounded-xl p-6 max-w-md w-full">
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
              <div className="rounded-lg p-3 mb-4 flex items-start gap-2" style={{ backgroundColor: 'var(--error-bg)', border: '1px solid var(--error-border)' }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--error-text)' }} />
                <p className="text-sm" style={{ color: 'var(--error-text)' }}>{wooConnectError}</p>
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

      {/* BigCommerce API Credentials Modal */}
      {showBigCommerceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-theme rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-theme-primary flex items-center gap-2">
                  <Store className="w-6 h-6 text-theme-accent" />
                  Connect BigCommerce
                </h3>
                <p className="text-theme-muted text-sm mt-1">
                  Enter your Store Hash and Access Token
                </p>
              </div>
              <button
                onClick={() => {
                  setShowBigCommerceModal(false);
                  setBigCommerceConnectError(null);
                }}
                className="p-2 bg-theme-secondary/30 hover:bg-white/20 text-theme-primary rounded-lg transition"
              >
                ✕
              </button>
            </div>
            
            <div className="bg-accent-subtle border border-theme-accent/30 rounded-lg p-3 mb-4">
              <p className="text-theme-accent text-sm">
                <strong>How to get credentials:</strong> In BigCommerce, go to Settings → API → Store-level API accounts → Create API Account. 
                Select <strong>Orders (Read-Only)</strong> scope.
              </p>
              <p className="text-theme-accent/70 text-xs mt-2">
                Your Store Hash is in the API Path (e.g., stores/<strong>abc123</strong>/v3).
              </p>
            </div>

            {bigCommerceConnectError && (
              <div className="rounded-lg p-3 mb-4 flex items-start gap-2" style={{ backgroundColor: 'var(--error-bg)', border: '1px solid var(--error-border)' }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--error-text)' }} />
                <p className="text-sm" style={{ color: 'var(--error-text)' }}>{bigCommerceConnectError}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-theme-secondary text-sm mb-2">Store Hash</label>
                <input
                  type="text"
                  value={bigCommerceStoreHash}
                  onChange={(e) => setBigCommerceStoreHash(e.target.value)}
                  placeholder="abc123"
                  className="w-full px-4 py-3 bg-theme-secondary/30 border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-theme-secondary text-sm mb-2">Access Token</label>
                <input
                  type="password"
                  value={bigCommerceAccessToken}
                  onChange={(e) => setBigCommerceAccessToken(e.target.value)}
                  placeholder="Enter your access token"
                  className="w-full px-4 py-3 bg-theme-secondary/30 border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowBigCommerceModal(false);
                  setBigCommerceStoreHash('');
                  setBigCommerceAccessToken('');
                  setBigCommerceConnectError(null);
                }}
                className="px-4 py-2 bg-theme-secondary/30 hover:bg-white/20 text-theme-primary rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleBigCommerceConnect}
                disabled={!bigCommerceStoreHash.trim() || !bigCommerceAccessToken.trim() || connectingPlatform === 'bigcommerce'}
                className="flex-1 btn-theme-primary text-theme-primary px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {connectingPlatform === 'bigcommerce' ? (
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

      {/* Magento API Credentials Modal */}
      {showMagentoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-theme rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-theme-primary flex items-center gap-2">
                  <Store className="w-6 h-6 text-theme-accent" />
                  Connect Magento / Adobe Commerce
                </h3>
                <p className="text-theme-muted text-sm mt-1">
                  Enter your store URL and Access Token
                </p>
              </div>
              <button
                onClick={() => {
                  setShowMagentoModal(false);
                  setMagentoConnectError(null);
                }}
                className="p-2 bg-theme-secondary/30 hover:bg-white/20 text-theme-primary rounded-lg transition"
              >
                ✕
              </button>
            </div>
            
            <div className="bg-accent-subtle border border-theme-accent/30 rounded-lg p-3 mb-4">
              <p className="text-theme-accent text-sm">
                <strong>How to get an Access Token:</strong> In Magento Admin, go to System → Integrations → Add New Integration. 
                Give it <strong>Sales (Orders)</strong> read access, then activate to get the Access Token.
              </p>
              <p className="text-theme-accent/70 text-xs mt-2">
                For Adobe Commerce Cloud, use your store&apos;s base URL (e.g., https://mystore.com).
              </p>
            </div>

            {magentoConnectError && (
              <div className="rounded-lg p-3 mb-4 flex items-start gap-2" style={{ backgroundColor: 'var(--error-bg)', border: '1px solid var(--error-border)' }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--error-text)' }} />
                <p className="text-sm" style={{ color: 'var(--error-text)' }}>{magentoConnectError}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-theme-secondary text-sm mb-2">Store URL</label>
                <input
                  type="text"
                  value={magentoStoreUrl}
                  onChange={(e) => setMagentoStoreUrl(e.target.value)}
                  placeholder="https://mystore.com"
                  className="w-full px-4 py-3 bg-theme-secondary/30 border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-theme-secondary text-sm mb-2">Access Token</label>
                <input
                  type="password"
                  value={magentoAccessToken}
                  onChange={(e) => setMagentoAccessToken(e.target.value)}
                  placeholder="Enter your access token"
                  className="w-full px-4 py-3 bg-theme-secondary/30 border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowMagentoModal(false);
                  setMagentoStoreUrl('');
                  setMagentoAccessToken('');
                  setMagentoConnectError(null);
                }}
                className="px-4 py-2 bg-theme-secondary/30 hover:bg-white/20 text-theme-primary rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleMagentoConnect}
                disabled={!magentoStoreUrl.trim() || !magentoAccessToken.trim() || connectingPlatform === 'magento'}
                className="flex-1 btn-theme-primary text-theme-primary px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {connectingPlatform === 'magento' ? (
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

      {/* PrestaShop API Key Modal */}
      {showPrestaShopModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-theme rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-theme-primary flex items-center gap-2">
                  <Store className="w-6 h-6 text-theme-accent" />
                  Connect PrestaShop
                </h3>
                <p className="text-theme-muted text-sm mt-1">
                  Enter your store URL and Webservice API Key
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPrestaShopModal(false);
                  setPrestaShopConnectError(null);
                }}
                className="p-2 bg-theme-secondary/30 hover:bg-white/20 text-theme-primary rounded-lg transition"
              >
                ✕
              </button>
            </div>
            
            <div className="bg-accent-subtle border border-theme-accent/30 rounded-lg p-3 mb-4">
              <p className="text-theme-accent text-sm">
                <strong>How to get an API Key:</strong> In PrestaShop Admin, go to Advanced Parameters → Webservice → Add new key. 
                Enable <strong>orders</strong>, <strong>addresses</strong>, and <strong>customers</strong> with GET permission.
              </p>
            </div>

            {prestaShopConnectError && (
              <div className="rounded-lg p-3 mb-4 flex items-start gap-2" style={{ backgroundColor: 'var(--error-bg)', border: '1px solid var(--error-border)' }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--error-text)' }} />
                <p className="text-sm" style={{ color: 'var(--error-text)' }}>{prestaShopConnectError}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-theme-secondary text-sm mb-2">Store URL</label>
                <input
                  type="text"
                  value={prestaShopStoreUrl}
                  onChange={(e) => setPrestaShopStoreUrl(e.target.value)}
                  placeholder="https://mystore.com"
                  className="w-full px-4 py-3 bg-theme-secondary/30 border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-theme-secondary text-sm mb-2">Webservice API Key</label>
                <input
                  type="password"
                  value={prestaShopApiKey}
                  onChange={(e) => setPrestaShopApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="w-full px-4 py-3 bg-theme-secondary/30 border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPrestaShopModal(false);
                  setPrestaShopStoreUrl('');
                  setPrestaShopApiKey('');
                  setPrestaShopConnectError(null);
                }}
                className="px-4 py-2 bg-theme-secondary/30 hover:bg-white/20 text-theme-primary rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePrestaShopConnect}
                disabled={!prestaShopStoreUrl.trim() || !prestaShopApiKey.trim() || connectingPlatform === 'prestashop'}
                className="flex-1 btn-theme-primary text-theme-primary px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {connectingPlatform === 'prestashop' ? (
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

      {/* OpenCart API Credentials Modal */}
      {showOpenCartModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-theme rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-theme-primary flex items-center gap-2">
                  <Store className="w-6 h-6 text-theme-accent" />
                  Connect OpenCart
                </h3>
                <p className="text-theme-muted text-sm mt-1">
                  Enter your store URL and API credentials
                </p>
              </div>
              <button
                onClick={() => {
                  setShowOpenCartModal(false);
                  setOpenCartConnectError(null);
                }}
                className="p-2 bg-theme-secondary/30 hover:bg-white/20 text-theme-primary rounded-lg transition"
              >
                ✕
              </button>
            </div>
            
            <div className="bg-accent-subtle border border-theme-accent/30 rounded-lg p-3 mb-4">
              <p className="text-theme-accent text-sm">
                <strong>How to get API credentials:</strong> In OpenCart Admin, go to System → Users → API → Add New. 
                Generate a key and <strong>add your server IP</strong> to the allowed list.
              </p>
              <p className="text-theme-accent/70 text-xs mt-2">
                Note: IP whitelisting is required for API access.
              </p>
            </div>

            {openCartConnectError && (
              <div className="rounded-lg p-3 mb-4 flex items-start gap-2" style={{ backgroundColor: 'var(--error-bg)', border: '1px solid var(--error-border)' }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--error-text)' }} />
                <p className="text-sm" style={{ color: 'var(--error-text)' }}>{openCartConnectError}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-theme-secondary text-sm mb-2">Store URL</label>
                <input
                  type="text"
                  value={openCartStoreUrl}
                  onChange={(e) => setOpenCartStoreUrl(e.target.value)}
                  placeholder="https://mystore.com"
                  className="w-full px-4 py-3 bg-theme-secondary/30 border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-theme-secondary text-sm mb-2">API Username</label>
                <input
                  type="text"
                  value={openCartApiUsername}
                  onChange={(e) => setOpenCartApiUsername(e.target.value)}
                  placeholder="Default"
                  className="w-full px-4 py-3 bg-theme-secondary/30 border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-theme-secondary text-sm mb-2">API Key</label>
                <input
                  type="password"
                  value={openCartApiKey}
                  onChange={(e) => setOpenCartApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="w-full px-4 py-3 bg-theme-secondary/30 border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowOpenCartModal(false);
                  setOpenCartStoreUrl('');
                  setOpenCartApiUsername('');
                  setOpenCartApiKey('');
                  setOpenCartConnectError(null);
                }}
                className="px-4 py-2 bg-theme-secondary/30 hover:bg-white/20 text-theme-primary rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleOpenCartConnect}
                disabled={!openCartStoreUrl.trim() || !openCartApiUsername.trim() || !openCartApiKey.trim() || connectingPlatform === 'opencart'}
                className="flex-1 btn-theme-primary text-theme-primary px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {connectingPlatform === 'opencart' ? (
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

      {/* Ecwid API Credentials Modal */}
      {showEcwidModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-theme rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-theme-primary flex items-center gap-2">
                  <Store className="w-6 h-6 text-theme-accent" />
                  Connect Ecwid
                </h3>
                <p className="text-theme-muted text-sm mt-1">
                  Enter your Store ID and API Token
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEcwidModal(false);
                  setEcwidConnectError(null);
                }}
                className="p-2 bg-theme-secondary/30 hover:bg-white/20 text-theme-primary rounded-lg transition"
              >
                ✕
              </button>
            </div>
            
            <div className="bg-accent-subtle border border-theme-accent/30 rounded-lg p-3 mb-4">
              <p className="text-theme-accent text-sm">
                <strong>Where to find credentials:</strong> In Ecwid Admin, go to Settings → API → Access tokens. 
                Your Store ID is shown at the top, and you can copy your Secret token.
              </p>
            </div>

            {ecwidConnectError && (
              <div className="rounded-lg p-3 mb-4 flex items-start gap-2" style={{ backgroundColor: 'var(--error-bg)', border: '1px solid var(--error-border)' }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--error-text)' }} />
                <p className="text-sm" style={{ color: 'var(--error-text)' }}>{ecwidConnectError}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-theme-secondary text-sm mb-2">Store ID</label>
                <input
                  type="text"
                  value={ecwidStoreId}
                  onChange={(e) => setEcwidStoreId(e.target.value)}
                  placeholder="12345678"
                  className="w-full px-4 py-3 bg-theme-secondary/30 border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-theme-secondary text-sm mb-2">Secret API Token</label>
                <input
                  type="password"
                  value={ecwidApiToken}
                  onChange={(e) => setEcwidApiToken(e.target.value)}
                  placeholder="secret_..."
                  className="w-full px-4 py-3 bg-theme-secondary/30 border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEcwidModal(false);
                  setEcwidStoreId('');
                  setEcwidApiToken('');
                  setEcwidConnectError(null);
                }}
                className="px-4 py-2 bg-theme-secondary/30 hover:bg-white/20 text-theme-primary rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleEcwidConnect}
                disabled={!ecwidStoreId.trim() || !ecwidApiToken.trim() || connectingPlatform === 'ecwid'}
                className="flex-1 btn-theme-primary text-theme-primary px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {connectingPlatform === 'ecwid' ? (
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
          <div className="card-theme rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-theme-primary flex items-center gap-2">
                  <Store className="w-6 h-6 text-theme-accent" />
                  Connect Squarespace
                </h3>
                <p className="text-theme-muted text-sm mt-1">
                  Enter your Squarespace API Key
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
                Select <strong>Orders API Read</strong> permission.
              </p>
              <p className="text-theme-accent/70 text-xs mt-2">
                Note: Requires Commerce Advanced plan for Orders API access.
              </p>
            </div>

            {squarespaceConnectError && (
              <div className="rounded-lg p-3 mb-4 flex items-start gap-2" style={{ backgroundColor: 'var(--error-bg)', border: '1px solid var(--error-border)' }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--error-text)' }} />
                <p className="text-sm" style={{ color: 'var(--error-text)' }}>{squarespaceConnectError}</p>
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
                <p className="text-theme-muted text-xs mt-1">
                  A friendly name to identify this store in your dashboard
                </p>
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

      {/* Platform Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-theme rounded-xl p-6 max-w-md w-full">
            {requestSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-theme-primary mb-2">Request Submitted!</h3>
                <p className="text-theme-muted">
                  Thank you for your feedback. We&apos;ll review your request.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-theme-primary">Request Platform Integration</h3>
                    <p className="text-theme-muted text-sm mt-1">
                      Tell us which platform you&apos;d like us to support
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowRequestModal(false);
                      setRequestedPlatform('');
                    }}
                    className="p-2 bg-theme-secondary/30 hover:bg-white/20 text-theme-primary rounded-lg transition"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="mb-6">
                  <label className="block text-theme-secondary text-sm mb-2">Platform Name</label>
                  <input
                    type="text"
                    value={requestedPlatform}
                    onChange={(e) => setRequestedPlatform(e.target.value)}
                    placeholder="e.g., Wix, Magento, PrestaShop..."
                    className="w-full px-4 py-3 bg-theme-secondary/30 border border-theme-secondary rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowRequestModal(false);
                      setRequestedPlatform('');
                    }}
                    className="px-4 py-2 bg-theme-secondary/30 hover:bg-white/20 text-theme-primary rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePlatformRequest}
                    disabled={!requestedPlatform.trim() || requestSubmitting}
                    className="flex-1 btn-theme-primary text-theme-primary px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {requestSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Request'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

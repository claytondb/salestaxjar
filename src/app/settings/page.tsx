'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { BusinessProfile, BillingInfo } from '@/types';
import { stateTaxRates } from '@/data/taxRates';
import { exportUserData, deleteAllUserData } from '@/lib/security';

const businessTypes = [
  { value: 'retail', label: 'Retail Store' },
  { value: 'ecommerce', label: 'E-commerce Only' },
  { value: 'services', label: 'Services' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'other', label: 'Other' },
];

const plans = [
  { 
    id: 'starter', 
    name: 'Starter', 
    price: 29, 
    tier: 0,
    features: ['Up to 500 orders/mo', '3 state filings', 'Shopify integration', 'Email support']
  },
  { 
    id: 'growth', 
    name: 'Growth', 
    price: 79, 
    tier: 1,
    features: ['Up to 5,000 orders/mo', 'Unlimited filings', 'All integrations', 'Priority support', 'Nexus tracking'],
    popular: true
  },
  { 
    id: 'enterprise', 
    name: 'Enterprise', 
    price: 199, 
    tier: 2,
    features: ['Unlimited orders', 'Unlimited filings', 'Custom integrations', 'Dedicated manager', 'Audit protection']
  },
];

export default function SettingsPage() {
  const { 
    user,
    businessProfile, 
    updateBusinessProfile, 
    connectedPlatforms, 
    togglePlatformConnection,
    notifications,
    updateNotifications,
    billing,
    updateBilling,
    updateUser,
    isLoading 
  } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // Billing state
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [prorationPreview, setProrationPreview] = useState<{
    isUpgrade: boolean;
    immediateCharge?: number;
    prorationAmount?: number;
  } | null>(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState<BusinessProfile>({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    businessType: 'ecommerce',
    ein: '',
  });

  // Account form state
  const [accountForm, setAccountForm] = useState({
    name: '',
    email: '',
  });

  // Initialize forms when data loads
  useEffect(() => {
    if (businessProfile) {
      setProfileForm(businessProfile);
    }
    if (user) {
      setAccountForm({ name: user.name, email: user.email });
    }
  }, [businessProfile, user]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Handle hash navigation
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && ['profile', 'account', 'notifications', 'platforms', 'billing', 'privacy'].includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  // Data export handler
  const handleExportData = () => {
    const data = exportUserData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salestaxjar-data-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSaveMessage('Data exported successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  // Account deletion handler
  const handleDeleteAccount = () => {
    if (deleteConfirmText.toLowerCase() !== 'delete my account') {
      setSaveMessage('Please type "delete my account" to confirm');
      return;
    }
    deleteAllUserData();
    router.push('/');
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    updateBusinessProfile(profileForm);
    setSaveMessage('Business profile saved!');
    setIsSaving(false);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleSaveAccount = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    updateUser({ name: accountForm.name });
    setSaveMessage('Account updated!');
    setIsSaving(false);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setSaveMessage('Notification preferences saved!');
    setIsSaving(false);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  // Handle plan selection
  const handleSelectPlan = async (planId: string) => {
    if (planId === billing.plan) {
      setSelectedPlan(null);
      setProrationPreview(null);
      return;
    }
    
    setSelectedPlan(planId);
    
    if (billing.cardLast4) {
      const currentPlan = plans.find(p => p.id === billing.plan);
      const newPlan = plans.find(p => p.id === planId);
      
      if (currentPlan && newPlan) {
        const isUpgrade = newPlan.tier > currentPlan.tier;
        
        if (isUpgrade) {
          const daysInMonth = 30;
          const daysRemaining = 15;
          const currentDaily = currentPlan.price / daysInMonth;
          const newDaily = newPlan.price / daysInMonth;
          const prorationAmount = (newDaily - currentDaily) * daysRemaining;
          
          setProrationPreview({
            isUpgrade: true,
            immediateCharge: Math.max(0, prorationAmount),
            prorationAmount: prorationAmount,
          });
        } else {
          setProrationPreview({
            isUpgrade: false,
          });
        }
      }
    } else {
      const currentPlan = plans.find(p => p.id === billing.plan);
      const newPlan = plans.find(p => p.id === planId);
      if (currentPlan && newPlan) {
        setProrationPreview({
          isUpgrade: newPlan.tier > currentPlan.tier,
        });
      }
    }
  };

  // Handle checkout / plan change
  const handleCheckout = async () => {
    if (!selectedPlan) return;
    
    setIsCheckingOut(true);
    
    try {
      const hasActiveSubscription = !!billing.cardLast4;
      
      if (hasActiveSubscription) {
        const response = await fetch('/api/stripe/update-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            newPlanId: selectedPlan,
            action: 'update'
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to update subscription');
        }
        
        const plan = plans.find(p => p.id === selectedPlan);
        if (plan) {
          updateBilling({
            ...billing,
            plan: selectedPlan as BillingInfo['plan'],
            monthlyPrice: plan.price,
          });
        }
        
        setSaveMessage(data.message);
        setSelectedPlan(null);
        setProrationPreview(null);
      } else {
        const response = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: selectedPlan }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          if (data.demo) {
            const plan = plans.find(p => p.id === selectedPlan);
            if (plan) {
              updateBilling({
                ...billing,
                plan: selectedPlan as BillingInfo['plan'],
                monthlyPrice: plan.price,
                cardLast4: '4242',
                cardBrand: 'Visa',
                nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
              });
            }
            setSaveMessage(`Subscribed to ${plan?.name} plan! (Demo mode)`);
            setSelectedPlan(null);
            setProrationPreview(null);
          } else {
            throw new Error(data.error || 'Failed to create checkout session');
          }
        } else if (data.url) {
          window.location.href = data.url;
          return;
        }
      }
    } catch (error) {
      setSaveMessage(`Error: ${error instanceof Error ? error.message : 'Something went wrong'}`);
    } finally {
      setIsCheckingOut(false);
      setTimeout(() => setSaveMessage(''), 5000);
    }
  };

  const handleCancelSelection = () => {
    setSelectedPlan(null);
    setProrationPreview(null);
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text)] mb-2">Settings</h1>
          <p className="text-[var(--color-text-muted)]">Manage your account and preferences</p>
        </div>

        {/* Success Message */}
        {saveMessage && (
          <div className="mb-6 bg-[var(--color-success-bg)] border border-[var(--color-success-border)] text-[var(--color-success)] px-4 py-3 rounded-lg">
            ✓ {saveMessage}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden shadow-sm">
              {[
                { id: 'profile', label: 'Business Profile', icon: '🏢' },
                { id: 'account', label: 'Account', icon: '👤' },
                { id: 'notifications', label: 'Notifications', icon: '🔔' },
                { id: 'platforms', label: 'Platforms', icon: '🔗' },
                { id: 'billing', label: 'Billing', icon: '💳' },
                { id: 'privacy', label: 'Data & Privacy', icon: '🔒' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                    activeTab === tab.id 
                      ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)] border-l-2 border-[var(--color-primary)]' 
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] border-l-2 border-transparent'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Business Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-[var(--color-text)] mb-6">Business Profile</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[var(--color-text-secondary)] mb-2 font-medium">Business Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      placeholder="Acme Inc."
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--color-text-secondary)] mb-2 font-medium">Business Type</label>
                    <select
                      value={profileForm.businessType}
                      onChange={(e) => setProfileForm({ ...profileForm, businessType: e.target.value as BusinessProfile['businessType'] })}
                      className="w-full px-4 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    >
                      {businessTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[var(--color-text-secondary)] mb-2 font-medium">Street Address</label>
                    <input
                      type="text"
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      placeholder="123 Main St"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[var(--color-text-secondary)] mb-2 font-medium">City</label>
                      <input
                        type="text"
                        value={profileForm.city}
                        onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        placeholder="San Francisco"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--color-text-secondary)] mb-2 font-medium">State</label>
                      <select
                        value={profileForm.state}
                        onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      >
                        <option value="">Select...</option>
                        {stateTaxRates.map(state => (
                          <option key={state.stateCode} value={state.stateCode}>
                            {state.stateCode}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[var(--color-text-secondary)] mb-2 font-medium">ZIP Code</label>
                      <input
                        type="text"
                        value={profileForm.zip}
                        onChange={(e) => setProfileForm({ ...profileForm, zip: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        placeholder="94102"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[var(--color-text-secondary)] mb-2 font-medium">EIN (Optional)</label>
                    <input
                      type="text"
                      value={profileForm.ein || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, ein: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      placeholder="XX-XXXXXXX"
                    />
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50 shadow-md"
                  >
                    {isSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-[var(--color-text)] mb-6">Account Settings</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[var(--color-text-secondary)] mb-2 font-medium">Full Name</label>
                    <input
                      type="text"
                      value={accountForm.name}
                      onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--color-text-secondary)] mb-2 font-medium">Email</label>
                    <input
                      type="email"
                      value={accountForm.email}
                      disabled
                      className="w-full px-4 py-3 bg-[var(--color-bg-muted)] border border-[var(--color-border-light)] rounded-lg text-[var(--color-text-muted)] cursor-not-allowed"
                    />
                    <p className="text-[var(--color-text-light)] text-sm mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-[var(--color-text-secondary)] mb-2 font-medium">Member Since</label>
                    <div className="text-[var(--color-text-muted)]">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>

                  <button
                    onClick={handleSaveAccount}
                    disabled={isSaving}
                    className="bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50 shadow-md"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

                <hr className="border-[var(--color-border)] my-8" />

                <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Password</h3>
                <p className="text-[var(--color-text-muted)] text-sm mb-4">
                  Password management is available in the Data &amp; Privacy section.
                </p>
                <button 
                  onClick={() => setActiveTab('privacy')}
                  className="text-[var(--color-primary)] hover:underline text-sm font-medium"
                >
                  Go to Data &amp; Privacy →
                </button>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-[var(--color-text)] mb-6">Notification Preferences</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-[var(--color-text)] mb-4">Email Notifications</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'emailDeadlineReminders', label: 'Filing deadline reminders' },
                        { key: 'emailWeeklyDigest', label: 'Weekly tax summary digest' },
                        { key: 'emailNewRates', label: 'Tax rate change alerts' },
                      ].map((item) => (
                        <label key={item.key} className="flex items-center justify-between p-3 bg-[var(--color-bg-muted)] rounded-lg cursor-pointer hover:bg-[var(--color-bg-card-hover)] transition">
                          <span className="text-[var(--color-text-secondary)]">{item.label}</span>
                          <button
                            onClick={() => updateNotifications({ 
                              ...notifications, 
                              [item.key]: !notifications[item.key as keyof typeof notifications] 
                            })}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                              notifications[item.key as keyof typeof notifications] ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-text-light)]'
                            }`}
                          >
                            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                              notifications[item.key as keyof typeof notifications] ? 'translate-x-6' : ''
                            }`} />
                          </button>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-[var(--color-text)] mb-4">Push Notifications</h3>
                    <label className="flex items-center justify-between p-3 bg-[var(--color-bg-muted)] rounded-lg cursor-pointer hover:bg-[var(--color-bg-card-hover)] transition">
                      <span className="text-[var(--color-text-secondary)]">Deadline reminders</span>
                      <button
                        onClick={() => updateNotifications({ ...notifications, pushDeadlines: !notifications.pushDeadlines })}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          notifications.pushDeadlines ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-text-light)]'
                        }`}
                      >
                        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          notifications.pushDeadlines ? 'translate-x-6' : ''
                        }`} />
                      </button>
                    </label>
                  </div>

                  <div>
                    <label className="block text-[var(--color-text-secondary)] mb-2 font-medium">Remind me before deadlines</label>
                    <select
                      value={notifications.reminderDaysBefore}
                      onChange={(e) => updateNotifications({ ...notifications, reminderDaysBefore: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    >
                      <option value={3}>3 days before</option>
                      <option value={7}>7 days before</option>
                      <option value={14}>14 days before</option>
                      <option value={30}>30 days before</option>
                    </select>
                  </div>

                  <button
                    onClick={handleSaveNotifications}
                    disabled={isSaving}
                    className="bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50 shadow-md"
                  >
                    {isSaving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            )}

            {/* Platforms Tab */}
            {activeTab === 'platforms' && (
              <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">Connected Platforms</h2>
                <p className="text-[var(--color-text-muted)] mb-6">Connect your sales channels to automatically import transactions</p>
                
                <div className="space-y-4">
                  {connectedPlatforms.map((platform) => (
                    <div 
                      key={platform.id}
                      className={`p-4 rounded-xl border transition ${
                        platform.connected 
                          ? 'bg-[var(--color-success-bg)] border-[var(--color-success-border)]' 
                          : 'bg-[var(--color-bg-muted)] border-[var(--color-border)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[var(--color-bg-card)] rounded-xl flex items-center justify-center text-2xl border border-[var(--color-border)]">
                            {platform.type === 'shopify' && '🛒'}
                            {platform.type === 'amazon' && '📦'}
                            {platform.type === 'etsy' && '🎨'}
                            {platform.type === 'woocommerce' && '🔌'}
                            {platform.type === 'bigcommerce' && '🏪'}
                            {platform.type === 'ebay' && '🏷️'}
                            {platform.type === 'square' && '⬛'}
                          </div>
                          <div>
                            <h3 className="font-medium text-[var(--color-text)]">{platform.name}</h3>
                            {platform.connected ? (
                              <div className="text-sm text-[var(--color-text-muted)]">
                                {platform.ordersImported?.toLocaleString()} orders imported • 
                                Last sync: {platform.lastSync ? new Date(platform.lastSync).toLocaleDateString() : 'Never'}
                              </div>
                            ) : (
                              <div className="text-sm text-[var(--color-text-light)]">Not connected</div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => togglePlatformConnection(platform.id)}
                          className={`px-4 py-2 rounded-lg font-medium transition ${
                            platform.connected 
                              ? 'bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-hover)] text-[var(--color-text)] border border-[var(--color-border)]' 
                              : 'bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white'
                          }`}
                        >
                          {platform.connected ? 'Disconnect' : 'Connect'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-[var(--color-bg-muted)] rounded-xl border border-[var(--color-border)]">
                  <h4 className="font-medium text-[var(--color-text)] mb-2">Need a different platform?</h4>
                  <p className="text-[var(--color-text-muted)] text-sm">
                    Contact us to request an integration for your sales platform.
                  </p>
                </div>
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                {/* Current Plan */}
                <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">Current Plan</h2>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-[var(--color-text)]">
                        {billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1)}
                      </div>
                      <div className="text-[var(--color-text-muted)]">${billing.monthlyPrice}/month</div>
                    </div>
                    <span className="px-3 py-1 bg-[var(--color-success-bg)] text-[var(--color-success)] rounded-full text-sm border border-[var(--color-success-border)]">
                      Active
                    </span>
                  </div>
                </div>

                {/* Plan Selection */}
                <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">Available Plans</h2>
                  <p className="text-[var(--color-text-muted)] text-sm mb-6">Select a plan to see pricing details</p>
                  <div className="grid md:grid-cols-3 gap-4">
                    {plans.map((plan) => {
                      const isCurrentPlan = billing.plan === plan.id;
                      const isSelected = selectedPlan === plan.id;
                      
                      return (
                        <div 
                          key={plan.id}
                          onClick={() => !isCurrentPlan && handleSelectPlan(plan.id)}
                          className={`p-6 rounded-xl border transition cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--color-primary-bg)] border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]'
                              : isCurrentPlan 
                                ? 'bg-[var(--color-success-bg)] border-[var(--color-success)]' 
                                : plan.popular 
                                  ? 'bg-[var(--color-bg-muted)] border-[var(--color-primary-border)] hover:bg-[var(--color-bg-card-hover)]' 
                                  : 'bg-[var(--color-bg-muted)] border-[var(--color-border)] hover:bg-[var(--color-bg-card-hover)]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            {plan.popular && !isCurrentPlan && (
                              <span className="px-2 py-0.5 bg-[var(--color-cta)] text-white text-xs rounded-full">
                                Most Popular
                              </span>
                            )}
                            {isCurrentPlan && (
                              <span className="px-2 py-0.5 bg-[var(--color-success-bg)] text-[var(--color-success)] text-xs rounded-full border border-[var(--color-success-border)]">
                                Current
                              </span>
                            )}
                            {isSelected && (
                              <span className="px-2 py-0.5 bg-[var(--color-primary)] text-white text-xs rounded-full">
                                Selected
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold text-[var(--color-text)]">{plan.name}</h3>
                          <div className="mt-2 mb-4">
                            <span className="text-3xl font-bold text-[var(--color-text)]">${plan.price}</span>
                            <span className="text-[var(--color-text-muted)]">/mo</span>
                          </div>
                          <ul className="space-y-2 mb-4">
                            {plan.features.map((feature, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                                <span className="text-[var(--color-success)]">✓</span>
                                {feature}
                              </li>
                            ))}
                          </ul>
                          {isCurrentPlan && (
                            <div className="text-center py-2 text-[var(--color-text-muted)] text-sm">
                              Your current plan
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Plan Change Summary & Checkout */}
                {selectedPlan && (
                  <div className="bg-[var(--color-primary-bg)] rounded-xl border border-[var(--color-primary-border)] p-6">
                    <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">
                      {prorationPreview?.isUpgrade ? '⬆️ Upgrade Summary' : '⬇️ Downgrade Summary'}
                    </h2>
                    
                    {prorationPreview?.isUpgrade ? (
                      <div className="space-y-3 mb-6">
                        <p className="text-[var(--color-text-secondary)]">
                          You&apos;re upgrading from <strong>{billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1)}</strong> to{' '}
                          <strong>{plans.find(p => p.id === selectedPlan)?.name}</strong>.
                        </p>
                        {prorationPreview.immediateCharge !== undefined && prorationPreview.immediateCharge > 0 && (
                          <div className="bg-[var(--color-bg-muted)] rounded-lg p-4 border border-[var(--color-border)]">
                            <div className="flex justify-between text-sm">
                              <span className="text-[var(--color-text-muted)]">Prorated charge (remaining days)</span>
                              <span className="text-[var(--color-text)] font-medium">~${prorationPreview.immediateCharge.toFixed(2)}</span>
                            </div>
                            <p className="text-[var(--color-text-light)] text-xs mt-2">
                              You&apos;ll be charged the difference for the remainder of your billing cycle.
                            </p>
                          </div>
                        )}
                        <p className="text-[var(--color-success)] text-sm">
                          ✓ Your upgrade will take effect immediately
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 mb-6">
                        <p className="text-[var(--color-text-secondary)]">
                          You&apos;re downgrading from <strong>{billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1)}</strong> to{' '}
                          <strong>{plans.find(p => p.id === selectedPlan)?.name}</strong>.
                        </p>
                        <div className="bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] rounded-lg p-4">
                          <p className="text-[var(--color-warning)] text-sm">
                            ⚠️ Your current plan will remain active until the end of your billing period.
                            The new plan will take effect on your next billing date.
                          </p>
                        </div>
                        <p className="text-[var(--color-text-muted)] text-sm">
                          Next billing date: {billing.nextBillingDate || 'N/A'}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={handleCancelSelection}
                        className="px-4 py-2 bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-hover)] text-[var(--color-text)] rounded-lg transition border border-[var(--color-border)]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCheckout}
                        disabled={isCheckingOut}
                        className="flex-1 bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                      >
                        {isCheckingOut ? (
                          <>
                            <span className="animate-spin">⏳</span>
                            Processing...
                          </>
                        ) : billing.cardLast4 ? (
                          prorationPreview?.isUpgrade ? 'Confirm Upgrade' : 'Confirm Downgrade'
                        ) : (
                          'Proceed to Checkout'
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Payment Method */}
                <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">Payment Method</h2>
                  {billing.cardLast4 ? (
                    <div className="flex items-center justify-between p-4 bg-[var(--color-bg-muted)] rounded-lg border border-[var(--color-border)]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[var(--color-bg-card)] rounded flex items-center justify-center border border-[var(--color-border)]">
                          💳
                        </div>
                        <div>
                          <div className="font-medium text-[var(--color-text)]">
                            {billing.cardBrand} •••• {billing.cardLast4}
                          </div>
                          <div className="text-sm text-[var(--color-text-muted)]">
                            Next billing: {billing.nextBillingDate}
                          </div>
                        </div>
                      </div>
                      <button className="text-[var(--color-primary)] hover:underline text-sm font-medium">
                        Update
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-[var(--color-text-muted)] mb-4">No payment method on file</p>
                      <p className="text-[var(--color-text-light)] text-sm">Select a plan above to add a payment method</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Data & Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                {/* Privacy Overview */}
                <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">Data & Privacy</h2>
                  <p className="text-[var(--color-text-muted)] mb-4">
                    We take your privacy seriously. Below you can manage your data and privacy settings.
                    For more information, see our{' '}
                    <Link href="/privacy" className="text-[var(--color-primary)] hover:underline">Privacy Policy</Link>.
                  </p>
                  
                  <div className="bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] rounded-lg p-4">
                    <p className="text-[var(--color-warning)] text-sm">
                      <strong>⚠️ Demo Mode:</strong> This application uses browser localStorage for data storage. 
                      In production, all data would be securely encrypted and stored on protected servers.
                    </p>
                  </div>
                </div>

                {/* Your Rights */}
                <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">Your Data Rights</h2>
                  <p className="text-[var(--color-text-muted)] mb-4">
                    Under GDPR and CCPA, you have the following rights regarding your personal data:
                  </p>
                  <ul className="space-y-2 text-[var(--color-text-secondary)] text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-[var(--color-success)]">✓</span>
                      <strong>Right to Access:</strong> You can request a copy of your data
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[var(--color-success)]">✓</span>
                      <strong>Right to Portability:</strong> Export your data in a machine-readable format
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[var(--color-success)]">✓</span>
                      <strong>Right to Erasure:</strong> Delete your account and all associated data
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[var(--color-success)]">✓</span>
                      <strong>Right to Rectification:</strong> Update or correct your information
                    </li>
                  </ul>
                </div>

                {/* Export Data */}
                <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">Export Your Data</h2>
                  <p className="text-[var(--color-text-muted)] mb-4">
                    Download all your data in JSON format. This includes your profile, calculations, 
                    settings, and preferences.
                  </p>
                  <button
                    onClick={handleExportData}
                    className="bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white px-6 py-3 rounded-lg font-medium transition flex items-center gap-2 shadow-md"
                  >
                    <span>📥</span>
                    Export All Data
                  </button>
                </div>

                {/* Data Retention */}
                <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">Data Retention</h2>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between p-3 bg-[var(--color-bg-muted)] rounded-lg">
                      <span className="text-[var(--color-text-secondary)]">Account Data</span>
                      <span className="text-[var(--color-text-muted)]">While account is active + 30 days</span>
                    </div>
                    <div className="flex justify-between p-3 bg-[var(--color-bg-muted)] rounded-lg">
                      <span className="text-[var(--color-text-secondary)]">Tax Calculations</span>
                      <span className="text-[var(--color-text-muted)]">7 years (legal requirement)</span>
                    </div>
                    <div className="flex justify-between p-3 bg-[var(--color-bg-muted)] rounded-lg">
                      <span className="text-[var(--color-text-secondary)]">Usage Logs</span>
                      <span className="text-[var(--color-text-muted)]">90 days</span>
                    </div>
                    <div className="flex justify-between p-3 bg-[var(--color-bg-muted)] rounded-lg">
                      <span className="text-[var(--color-text-secondary)]">Cookie Preferences</span>
                      <span className="text-[var(--color-text-muted)]">1 year</span>
                    </div>
                  </div>
                </div>

                {/* Delete Account */}
                <div className="bg-[var(--color-error-bg)] rounded-xl border border-[var(--color-error-border)] p-6">
                  <h2 className="text-xl font-semibold text-[var(--color-error)] mb-2">⚠️ Delete Account</h2>
                  <p className="text-[var(--color-text-muted)] mb-4">
                    Permanently delete your account and all associated data. This action cannot be undone.
                    Some data may be retained for legal compliance purposes.
                  </p>
                  
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="bg-[var(--color-error-bg)] hover:bg-[var(--color-error)] hover:text-white text-[var(--color-error)] px-6 py-3 rounded-lg font-medium transition border border-[var(--color-error-border)]"
                    >
                      Delete My Account
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-[var(--color-error-bg)] border border-[var(--color-error-border)] rounded-lg p-4">
                        <p className="text-[var(--color-error)] text-sm mb-3">
                          To confirm deletion, please type <strong>&quot;delete my account&quot;</strong> below:
                        </p>
                        <input
                          type="text"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          className="w-full px-4 py-2 bg-[var(--color-bg-input)] border border-[var(--color-error-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]"
                          placeholder="delete my account"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirmText('');
                          }}
                          className="px-4 py-2 bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-hover)] text-[var(--color-text)] rounded-lg transition border border-[var(--color-border)]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleteConfirmText.toLowerCase() !== 'delete my account'}
                          className="px-6 py-2 bg-[var(--color-error)] hover:opacity-90 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Permanently Delete Account
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Contact for Privacy */}
                <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">Privacy Contact</h2>
                  <p className="text-[var(--color-text-muted)] mb-4">
                    For any privacy-related inquiries or to exercise your data rights, contact us:
                  </p>
                  <div className="space-y-2 text-sm">
                    <p className="text-[var(--color-text-secondary)]">
                      📧 Email:{' '}
                      <a href="mailto:privacy@salestaxjar.com" className="text-[var(--color-primary)] hover:underline">
                        privacy@salestaxjar.com
                      </a>
                    </p>
                    <p className="text-[var(--color-text-secondary)]">
                      🇪🇺 GDPR DPO:{' '}
                      <a href="mailto:dpo@salestaxjar.com" className="text-[var(--color-primary)] hover:underline">
                        dpo@salestaxjar.com
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

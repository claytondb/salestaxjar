'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PlatformsManager from '@/components/PlatformsManager';
import { BusinessProfile, BillingInfo } from '@/types';
import { stateTaxRates } from '@/data/taxRates';
import { exportUserData, deleteAllUserData } from '@/lib/security';
import { 
  Building2, 
  User, 
  Bell, 
  Link2, 
  CreditCard, 
  Lock,
  Check,
  Download,
  ShoppingCart,
  Package,
  Palette,
  Plug,
  Store,
  Tag,
  Square,
  Mail,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Loader2
} from 'lucide-react';

const ICON_CLASS = "w-5 h-5";

const platformIcons: Record<string, React.ReactNode> = {
  shopify: <ShoppingCart className="w-6 h-6 text-theme-secondary" />,
  amazon: <Package className="w-6 h-6 text-theme-secondary" />,
  etsy: <Palette className="w-6 h-6 text-theme-secondary" />,
  woocommerce: <Plug className="w-6 h-6 text-theme-secondary" />,
  bigcommerce: <Store className="w-6 h-6 text-theme-secondary" />,
  ebay: <Tag className="w-6 h-6 text-theme-secondary" />,
  square: <Square className="w-6 h-6 text-theme-secondary" />,
};

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
    id: 'free', 
    name: 'Free', 
    price: 0, 
    tier: 0,
    features: ['Nexus monitoring', 'Economic nexus alerts', 'Unlimited calculations', 'Email support']
  },
  { 
    id: 'starter', 
    name: 'Starter', 
    price: 9, 
    tier: 1,
    features: ['Up to 200 orders/mo', 'Shopify & WooCommerce', 'Track 3 states', 'CSV import']
  },
  { 
    id: 'pro', 
    name: 'Pro', 
    price: 29, 
    tier: 2,
    features: ['Up to 2,000 orders/mo', 'All integrations', 'Unlimited states', 'Faster email support'],
    popular: true
  },
  { 
    id: 'business', 
    name: 'Business', 
    price: 59, 
    tier: 3,
    features: ['Unlimited orders', 'Priority email support', 'API access', 'Advanced reporting']
  },
];

export default function SettingsPage() {
  const { 
    user,
    businessProfile, 
    updateBusinessProfile, 
    connectedPlatforms, 
    notifications,
    updateNotifications,
    billing,
    updateBilling,
    updateUser,
    isLoading,
    refreshData,
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

  // Handle plan selection (just selects, doesn't purchase)
  const handleSelectPlan = async (planId: string) => {
    if (planId === billing.plan) {
      setSelectedPlan(null);
      setProrationPreview(null);
      return;
    }
    
    setSelectedPlan(planId);
    
    // If user has an active subscription, preview the proration
    if (billing.cardLast4) {
      const currentPlan = plans.find(p => p.id === billing.plan);
      const newPlan = plans.find(p => p.id === planId);
      
      if (currentPlan && newPlan) {
        const isUpgrade = newPlan.tier > currentPlan.tier;
        
        if (isUpgrade) {
          // For upgrades, we could fetch proration preview from API
          // For now, show estimated difference
          const daysInMonth = 30;
          const daysRemaining = 15; // Approximate
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
      // No card on file - still need to determine if it's an upgrade for display
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
        // Update existing subscription
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
        
        // Update local state
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
        // New subscription - go to Stripe Checkout
        const response = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: selectedPlan }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          if (data.demo) {
            // Demo mode - simulate success
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
          // Redirect to Stripe Checkout
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

  // Cancel pending plan selection
  const handleCancelSelection = () => {
    setSelectedPlan(null);
    setProrationPreview(null);
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-theme-gradient flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-theme-accent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-gradient">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-theme-primary mb-2">Settings</h1>
          <p className="text-theme-muted">Manage your account and preferences</p>
        </div>

        {/* Success Message */}
        {saveMessage && (
          <div className="mb-6 btn-theme-primary/10 border border-theme-accent/30 text-theme-accent px-4 py-3 rounded-lg flex items-center gap-2">
            <Check className="w-4 h-4" />
            {saveMessage}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="card-theme rounded-xl border border-theme-primary overflow-hidden">
              {[
                { id: 'profile', label: 'Business Profile', icon: <Building2 className={ICON_CLASS} /> },
                { id: 'account', label: 'Account', icon: <User className={ICON_CLASS} /> },
                { id: 'notifications', label: 'Notifications', icon: <Bell className={ICON_CLASS} /> },
                { id: 'platforms', label: 'Platforms', icon: <Link2 className={ICON_CLASS} /> },
                { id: 'billing', label: 'Billing', icon: <CreditCard className={ICON_CLASS} /> },
                { id: 'privacy', label: 'Data & Privacy', icon: <Lock className={ICON_CLASS} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                    activeTab === tab.id 
                      ? 'btn-theme-primary/20 text-theme-accent border-l-2 border-theme-accent' 
                      : 'text-theme-secondary hover:bg-white/5 border-l-2 border-transparent'
                  }`}
                >
                  <span className={activeTab === tab.id ? 'text-theme-accent' : 'text-theme-muted'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Business Profile Tab */}
            {activeTab === 'profile' && (
              <div className="card-theme rounded-xl border border-theme-primary p-6">
                <h2 className="text-xl font-semibold text-theme-primary mb-6">Business Profile</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-theme-secondary mb-2 font-medium">Business Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Acme Inc."
                    />
                  </div>

                  <div>
                    <label className="block text-theme-secondary mb-2 font-medium">Business Type</label>
                    <select
                      value={profileForm.businessType}
                      onChange={(e) => setProfileForm({ ...profileForm, businessType: e.target.value as BusinessProfile['businessType'] })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {businessTypes.map(type => (
                        <option key={type.value} value={type.value} className="bg-slate-800">
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-theme-secondary mb-2 font-medium">Street Address</label>
                    <input
                      type="text"
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="123 Main St"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-theme-secondary mb-2 font-medium">City</label>
                      <input
                        type="text"
                        value={profileForm.city}
                        onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="San Francisco"
                      />
                    </div>
                    <div>
                      <label className="block text-theme-secondary mb-2 font-medium">State</label>
                      <select
                        value={profileForm.state}
                        onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="" className="bg-slate-800">Select...</option>
                        {stateTaxRates.map(state => (
                          <option key={state.stateCode} value={state.stateCode} className="bg-slate-800">
                            {state.stateCode}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-theme-secondary mb-2 font-medium">ZIP Code</label>
                      <input
                        type="text"
                        value={profileForm.zip}
                        onChange={(e) => setProfileForm({ ...profileForm, zip: e.target.value })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="94102"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-theme-secondary mb-2 font-medium">EIN (Optional)</label>
                    <input
                      type="text"
                      value={profileForm.ein || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, ein: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="XX-XXXXXXX"
                    />
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="btn-theme-primary  text-theme-primary px-6 py-3 rounded-lg font-medium transition disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="card-theme rounded-xl border border-theme-primary p-6">
                <h2 className="text-xl font-semibold text-theme-primary mb-6">Account Settings</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-theme-secondary mb-2 font-medium">Full Name</label>
                    <input
                      type="text"
                      value={accountForm.name}
                      onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-theme-secondary mb-2 font-medium">Email</label>
                    <input
                      type="email"
                      value={accountForm.email}
                      disabled
                      className="w-full px-4 py-3 bg-white/5 border border-theme-primary rounded-lg text-theme-muted cursor-not-allowed"
                    />
                    <p className="text-theme-muted text-sm mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-theme-secondary mb-2 font-medium">Member Since</label>
                    <div className="text-theme-muted">
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
                    className="btn-theme-primary  text-theme-primary px-6 py-3 rounded-lg font-medium transition disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

                <hr className="border-theme-primary my-8" />

                <h3 className="text-lg font-semibold text-theme-primary mb-4">Password</h3>
                <p className="text-theme-muted text-sm mb-4">
                  Password management is available in the Data &amp; Privacy section.
                </p>
                <button 
                  onClick={() => setActiveTab('privacy')}
                  className="text-theme-accent hover:text-emerald-300 text-sm font-medium"
                >
                  Go to Data &amp; Privacy →
                </button>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="card-theme rounded-xl border border-theme-primary p-6">
                <h2 className="text-xl font-semibold text-theme-primary mb-6">Notification Preferences</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-theme-primary mb-4">Email Notifications</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'emailDeadlineReminders', label: 'Filing deadline reminders' },
                        { key: 'emailWeeklyDigest', label: 'Weekly tax summary digest' },
                        { key: 'emailNewRates', label: 'Tax rate change alerts' },
                      ].map((item) => (
                        <label key={item.key} className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer">
                          <span className="text-theme-secondary">{item.label}</span>
                          <button
                            onClick={() => updateNotifications({ 
                              ...notifications, 
                              [item.key]: !notifications[item.key as keyof typeof notifications] 
                            })}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                              notifications[item.key as keyof typeof notifications] ? 'btn-theme-primary' : 'bg-gray-600'
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
                    <h3 className="font-medium text-theme-primary mb-4">Push Notifications</h3>
                    <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer">
                      <span className="text-theme-secondary">Deadline reminders</span>
                      <button
                        onClick={() => updateNotifications({ ...notifications, pushDeadlines: !notifications.pushDeadlines })}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          notifications.pushDeadlines ? 'btn-theme-primary' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          notifications.pushDeadlines ? 'translate-x-6' : ''
                        }`} />
                      </button>
                    </label>
                  </div>

                  <div>
                    <label className="block text-theme-secondary mb-2 font-medium">Remind me before deadlines</label>
                    <select
                      value={notifications.reminderDaysBefore}
                      onChange={(e) => updateNotifications({ ...notifications, reminderDaysBefore: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value={3} className="bg-slate-800">3 days before</option>
                      <option value={7} className="bg-slate-800">7 days before</option>
                      <option value={14} className="bg-slate-800">14 days before</option>
                      <option value={30} className="bg-slate-800">30 days before</option>
                    </select>
                  </div>

                  <button
                    onClick={handleSaveNotifications}
                    disabled={isSaving}
                    className="btn-theme-primary  text-theme-primary px-6 py-3 rounded-lg font-medium transition disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            )}

            {/* Platforms Tab */}
            {activeTab === 'platforms' && (
              <PlatformsManager />
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                {/* Current Plan */}
                <div className="card-theme rounded-xl border border-theme-primary p-6">
                  <h2 className="text-xl font-semibold text-theme-primary mb-4">Current Plan</h2>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-theme-primary">
                        {billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1)}
                      </div>
                      <div className="text-theme-muted">${billing.monthlyPrice}/month</div>
                    </div>
                    <span className="px-3 py-1 btn-theme-primary/20 text-theme-accent rounded-full text-sm">
                      Active
                    </span>
                  </div>
                </div>

                {/* Plan Selection */}
                <div className="card-theme rounded-xl border border-theme-primary p-6">
                  <h2 className="text-xl font-semibold text-theme-primary mb-2">Available Plans</h2>
                  <p className="text-theme-muted text-sm mb-6">Select a plan to see pricing details</p>
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
                              ? 'bg-purple-500/20 border-purple-500 ring-2 ring-purple-500'
                              : isCurrentPlan 
                                ? 'btn-theme-primary/20 border-theme-accent' 
                                : plan.popular 
                                  ? 'bg-white/5 border-theme-accent/50 hover:bg-white/10' 
                                  : 'bg-white/5 border-theme-primary hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            {plan.popular && !isCurrentPlan && (
                              <span className="px-2 py-0.5 btn-theme-primary text-theme-primary text-xs rounded-full">
                                Most Popular
                              </span>
                            )}
                            {isCurrentPlan && (
                              <span className="px-2 py-0.5 btn-theme-primary/30 text-theme-accent text-xs rounded-full">
                                Current
                              </span>
                            )}
                            {isSelected && (
                              <span className="px-2 py-0.5 bg-purple-500 text-theme-primary text-xs rounded-full">
                                Selected
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold text-theme-primary">{plan.name}</h3>
                          <div className="mt-2 mb-4">
                            <span className="text-3xl font-bold text-theme-primary">${plan.price}</span>
                            <span className="text-theme-muted">/mo</span>
                          </div>
                          <ul className="space-y-2 mb-4">
                            {plan.features.map((feature, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm text-theme-secondary">
                                <Check className="w-4 h-4 text-theme-accent flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                          {isCurrentPlan && (
                            <div className="text-center py-2 text-theme-muted text-sm">
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
                  <div className="bg-purple-500/10 backdrop-blur rounded-xl border border-purple-500/30 p-6">
                    <h2 className="text-xl font-semibold text-theme-primary mb-4 flex items-center gap-2">
                      {prorationPreview?.isUpgrade ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
                      {prorationPreview?.isUpgrade ? 'Upgrade Summary' : 'Downgrade Summary'}
                    </h2>
                    
                    {prorationPreview?.isUpgrade ? (
                      <div className="space-y-3 mb-6">
                        <p className="text-theme-secondary">
                          You&apos;re upgrading from <strong>{billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1)}</strong> to{' '}
                          <strong>{plans.find(p => p.id === selectedPlan)?.name}</strong>.
                        </p>
                        {prorationPreview.immediateCharge !== undefined && prorationPreview.immediateCharge > 0 && (
                          <div className="bg-white/5 rounded-lg p-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-theme-muted">Prorated charge (remaining days)</span>
                              <span className="text-theme-primary font-medium">~${prorationPreview.immediateCharge.toFixed(2)}</span>
                            </div>
                            <p className="text-theme-muted text-xs mt-2">
                              You&apos;ll be charged the difference for the remainder of your billing cycle.
                            </p>
                          </div>
                        )}
                        <p className="text-theme-accent text-sm flex items-center gap-1">
                          <Check className="w-4 h-4" /> Your upgrade will take effect immediately
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 mb-6">
                        <p className="text-theme-secondary">
                          You&apos;re downgrading from <strong>{billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1)}</strong> to{' '}
                          <strong>{plans.find(p => p.id === selectedPlan)?.name}</strong>.
                        </p>
                        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
                          <p className="text-sm flex items-start gap-2" style={{ color: 'var(--warning-text)' }}>
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>Your current plan will remain active until the end of your billing period.
                            The new plan will take effect on your next billing date.</span>
                          </p>
                        </div>
                        <p className="text-theme-muted text-sm">
                          Next billing date: {billing.nextBillingDate || 'N/A'}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={handleCancelSelection}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-theme-primary rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCheckout}
                        disabled={isCheckingOut}
                        className="flex-1 btn-theme-primary  text-theme-primary px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isCheckingOut ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
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
                <div className="card-theme rounded-xl border border-theme-primary p-6">
                  <h2 className="text-xl font-semibold text-theme-primary mb-4">Payment Method</h2>
                  {billing.cardLast4 ? (
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-theme-accent" />
                        </div>
                        <div>
                          <div className="font-medium text-theme-primary">
                            {billing.cardBrand} •••• {billing.cardLast4}
                          </div>
                          <div className="text-sm text-theme-muted">
                            Next billing: {billing.nextBillingDate}
                          </div>
                        </div>
                      </div>
                      <button className="text-theme-accent hover:text-emerald-300 text-sm font-medium">
                        Update
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-theme-muted mb-4">No payment method on file</p>
                      <p className="text-theme-muted text-sm">Select a plan above to add a payment method</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Data & Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                {/* Privacy Overview */}
                <div className="card-theme rounded-xl border border-theme-primary p-6">
                  <h2 className="text-xl font-semibold text-theme-primary mb-4">Data & Privacy</h2>
                  <p className="text-theme-muted mb-4">
                    We take your privacy seriously. Below you can manage your data and privacy settings.
                    For more information, see our{' '}
                    <Link href="/privacy" className="text-theme-accent hover:text-emerald-300">Privacy Policy</Link>.
                  </p>
                  
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
                    <p className="text-sm flex items-start gap-2" style={{ color: 'var(--warning-text)' }}>
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span><strong>Demo Mode:</strong> This application uses browser localStorage for data storage. 
                      In production, all data would be securely encrypted and stored on protected servers.</span>
                    </p>
                  </div>
                </div>

                {/* Your Rights */}
                <div className="card-theme rounded-xl border border-theme-primary p-6">
                  <h2 className="text-xl font-semibold text-theme-primary mb-4">Your Data Rights</h2>
                  <p className="text-theme-muted mb-4">
                    Under GDPR and CCPA, you have the following rights regarding your personal data:
                  </p>
                  <ul className="space-y-2 text-theme-secondary text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-theme-accent flex-shrink-0" />
                      <span><strong>Right to Access:</strong> You can request a copy of your data</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-theme-accent flex-shrink-0" />
                      <span><strong>Right to Portability:</strong> Export your data in a machine-readable format</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-theme-accent flex-shrink-0" />
                      <span><strong>Right to Erasure:</strong> Delete your account and all associated data</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-theme-accent flex-shrink-0" />
                      <span><strong>Right to Rectification:</strong> Update or correct your information</span>
                    </li>
                  </ul>
                </div>

                {/* Export Data */}
                <div className="card-theme rounded-xl border border-theme-primary p-6">
                  <h2 className="text-xl font-semibold text-theme-primary mb-2">Export Your Data</h2>
                  <p className="text-theme-muted mb-4">
                    Download all your data in JSON format. This includes your profile, calculations, 
                    settings, and preferences.
                  </p>
                  <button
                    onClick={handleExportData}
                    className="btn-theme-primary  text-theme-primary px-6 py-3 rounded-lg font-medium transition flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export All Data
                  </button>
                </div>

                {/* Data Retention */}
                <div className="card-theme rounded-xl border border-theme-primary p-6">
                  <h2 className="text-xl font-semibold text-theme-primary mb-4">Data Retention</h2>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-theme-secondary">Account Data</span>
                      <span className="text-theme-muted">While account is active + 30 days</span>
                    </div>
                    <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-theme-secondary">Tax Calculations</span>
                      <span className="text-theme-muted">7 years (legal requirement)</span>
                    </div>
                    <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-theme-secondary">Usage Logs</span>
                      <span className="text-theme-muted">90 days</span>
                    </div>
                    <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-theme-secondary">Cookie Preferences</span>
                      <span className="text-theme-muted">1 year</span>
                    </div>
                  </div>
                </div>

                {/* Delete Account */}
                <div className="backdrop-blur rounded-xl p-6" style={{ backgroundColor: 'var(--error-bg)', border: '1px solid var(--error-border)' }}>
                  <h2 className="text-xl font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--error-text)' }}>
                    <AlertTriangle className="w-5 h-5" /> Delete Account
                  </h2>
                  <p className="text-theme-secondary mb-4">
                    Permanently delete your account and all associated data. This action cannot be undone.
                    Some data may be retained for legal compliance purposes.
                  </p>
                  
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-6 py-3 rounded-lg font-medium transition"
                      style={{ backgroundColor: 'var(--error-bg)', color: 'var(--error-text)', border: '1px solid var(--error-border)' }}
                    >
                      Delete My Account
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--error-bg)', border: '1px solid var(--error-border)' }}>
                        <p className="text-sm mb-3" style={{ color: 'var(--error-text)' }}>
                          To confirm deletion, please type <strong>&quot;delete my account&quot;</strong> below:
                        </p>
                        <input
                          type="text"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          className="w-full px-4 py-2 bg-theme-input rounded-lg text-theme-primary focus:outline-none focus:ring-2"
                          style={{ borderColor: 'var(--error-border)', borderWidth: '1px' }}
                          placeholder="delete my account"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirmText('');
                          }}
                          className="px-4 py-2 card-theme text-theme-primary rounded-lg transition hover:opacity-80"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleteConfirmText.toLowerCase() !== 'delete my account'}
                          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Permanently Delete Account
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Contact for Privacy */}
                <div className="card-theme rounded-xl border border-theme-primary p-6">
                  <h2 className="text-xl font-semibold text-theme-primary mb-4">Privacy Contact</h2>
                  <p className="text-theme-muted mb-4">
                    For any privacy-related inquiries or to exercise your data rights, contact us:
                  </p>
                  <div className="space-y-2 text-sm">
                    <p className="text-theme-secondary flex items-center gap-2">
                      <Mail className="w-4 h-4 text-theme-accent" />
                      Email:{' '}
                      <a href="mailto:privacy@sails.tax" className="text-theme-accent hover:text-emerald-300">
                        privacy@sails.tax
                      </a>
                    </p>
                    <p className="text-theme-secondary flex items-center gap-2">
                      <Lock className="w-4 h-4 text-theme-accent" />
                      GDPR DPO:{' '}
                      <a href="mailto:dpo@sails.tax" className="text-theme-accent hover:text-emerald-300">
                        dpo@sails.tax
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

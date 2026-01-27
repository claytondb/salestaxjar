'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import { BusinessProfile, BillingInfo } from '@/types';
import { stateTaxRates } from '@/data/taxRates';

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
    features: ['Up to 500 orders/mo', '3 state filings', 'Shopify integration', 'Email support']
  },
  { 
    id: 'growth', 
    name: 'Growth', 
    price: 79, 
    features: ['Up to 5,000 orders/mo', 'Unlimited filings', 'All integrations', 'Priority support', 'Nexus tracking'],
    popular: true
  },
  { 
    id: 'enterprise', 
    name: 'Enterprise', 
    price: 199, 
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
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

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
    if (hash && ['profile', 'account', 'notifications', 'platforms', 'billing'].includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

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

  const handleChangePlan = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      updateBilling({
        ...billing,
        plan: planId as BillingInfo['plan'],
        monthlyPrice: plan.price,
      });
      setSaveMessage(`Upgraded to ${plan.name} plan!`);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account and preferences</p>
        </div>

        {/* Success Message */}
        {saveMessage && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-lg">
            ✓ {saveMessage}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="bg-white/10 backdrop-blur rounded-xl border border-white/10 overflow-hidden">
              {[
                { id: 'profile', label: 'Business Profile', icon: '🏢' },
                { id: 'account', label: 'Account', icon: '👤' },
                { id: 'notifications', label: 'Notifications', icon: '🔔' },
                { id: 'platforms', label: 'Platforms', icon: '🔗' },
                { id: 'billing', label: 'Billing', icon: '💳' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                    activeTab === tab.id 
                      ? 'bg-emerald-500/20 text-emerald-400 border-l-2 border-emerald-500' 
                      : 'text-gray-300 hover:bg-white/5 border-l-2 border-transparent'
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
              <div className="bg-white/10 backdrop-blur rounded-xl border border-white/10 p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Business Profile</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Business Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Acme Inc."
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Business Type</label>
                    <select
                      value={profileForm.businessType}
                      onChange={(e) => setProfileForm({ ...profileForm, businessType: e.target.value as BusinessProfile['businessType'] })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {businessTypes.map(type => (
                        <option key={type.value} value={type.value} className="bg-slate-800">
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Street Address</label>
                    <input
                      type="text"
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="123 Main St"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-2 font-medium">City</label>
                      <input
                        type="text"
                        value={profileForm.city}
                        onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="San Francisco"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2 font-medium">State</label>
                      <select
                        value={profileForm.state}
                        onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                      <label className="block text-gray-300 mb-2 font-medium">ZIP Code</label>
                      <input
                        type="text"
                        value={profileForm.zip}
                        onChange={(e) => setProfileForm({ ...profileForm, zip: e.target.value })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="94102"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">EIN (Optional)</label>
                    <input
                      type="text"
                      value={profileForm.ein || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, ein: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="XX-XXXXXXX"
                    />
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="bg-white/10 backdrop-blur rounded-xl border border-white/10 p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Account Settings</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Full Name</label>
                    <input
                      type="text"
                      value={accountForm.name}
                      onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Email</label>
                    <input
                      type="email"
                      value={accountForm.email}
                      disabled
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-400 cursor-not-allowed"
                    />
                    <p className="text-gray-500 text-sm mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Member Since</label>
                    <div className="text-gray-400">
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
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

                <hr className="border-white/10 my-8" />

                <h3 className="text-lg font-semibold text-white mb-4">Danger Zone</h3>
                <button className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition border border-red-500/30">
                  Delete Account
                </button>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="bg-white/10 backdrop-blur rounded-xl border border-white/10 p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Notification Preferences</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-white mb-4">Email Notifications</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'emailDeadlineReminders', label: 'Filing deadline reminders' },
                        { key: 'emailWeeklyDigest', label: 'Weekly tax summary digest' },
                        { key: 'emailNewRates', label: 'Tax rate change alerts' },
                      ].map((item) => (
                        <label key={item.key} className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer">
                          <span className="text-gray-300">{item.label}</span>
                          <button
                            onClick={() => updateNotifications({ 
                              ...notifications, 
                              [item.key]: !notifications[item.key as keyof typeof notifications] 
                            })}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                              notifications[item.key as keyof typeof notifications] ? 'bg-emerald-500' : 'bg-gray-600'
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
                    <h3 className="font-medium text-white mb-4">Push Notifications</h3>
                    <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer">
                      <span className="text-gray-300">Deadline reminders</span>
                      <button
                        onClick={() => updateNotifications({ ...notifications, pushDeadlines: !notifications.pushDeadlines })}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          notifications.pushDeadlines ? 'bg-emerald-500' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          notifications.pushDeadlines ? 'translate-x-6' : ''
                        }`} />
                      </button>
                    </label>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Remind me before deadlines</label>
                    <select
                      value={notifications.reminderDaysBefore}
                      onChange={(e) => updateNotifications({ ...notifications, reminderDaysBefore: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            )}

            {/* Platforms Tab */}
            {activeTab === 'platforms' && (
              <div className="bg-white/10 backdrop-blur rounded-xl border border-white/10 p-6">
                <h2 className="text-xl font-semibold text-white mb-2">Connected Platforms</h2>
                <p className="text-gray-400 mb-6">Connect your sales channels to automatically import transactions</p>
                
                <div className="space-y-4">
                  {connectedPlatforms.map((platform) => (
                    <div 
                      key={platform.id}
                      className={`p-4 rounded-xl border transition ${
                        platform.connected 
                          ? 'bg-emerald-500/10 border-emerald-500/30' 
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl">
                            {platform.type === 'shopify' && '🛒'}
                            {platform.type === 'amazon' && '📦'}
                            {platform.type === 'etsy' && '🎨'}
                            {platform.type === 'woocommerce' && '🔌'}
                            {platform.type === 'bigcommerce' && '🏪'}
                            {platform.type === 'ebay' && '🏷️'}
                            {platform.type === 'square' && '⬛'}
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{platform.name}</h3>
                            {platform.connected ? (
                              <div className="text-sm text-gray-400">
                                {platform.ordersImported?.toLocaleString()} orders imported • 
                                Last sync: {platform.lastSync ? new Date(platform.lastSync).toLocaleDateString() : 'Never'}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">Not connected</div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => togglePlatformConnection(platform.id)}
                          className={`px-4 py-2 rounded-lg font-medium transition ${
                            platform.connected 
                              ? 'bg-white/10 hover:bg-white/20 text-white' 
                              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                          }`}
                        >
                          {platform.connected ? 'Disconnect' : 'Connect'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
                  <h4 className="font-medium text-white mb-2">Need a different platform?</h4>
                  <p className="text-gray-400 text-sm">
                    Contact us to request an integration for your sales platform.
                  </p>
                </div>
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                {/* Current Plan */}
                <div className="bg-white/10 backdrop-blur rounded-xl border border-white/10 p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">Current Plan</h2>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1)}
                      </div>
                      <div className="text-gray-400">${billing.monthlyPrice}/month</div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">
                      Active
                    </span>
                  </div>
                </div>

                {/* Plan Selection */}
                <div className="bg-white/10 backdrop-blur rounded-xl border border-white/10 p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">Available Plans</h2>
                  <div className="grid md:grid-cols-3 gap-4">
                    {plans.map((plan) => (
                      <div 
                        key={plan.id}
                        className={`p-6 rounded-xl border transition ${
                          billing.plan === plan.id 
                            ? 'bg-emerald-500/20 border-emerald-500' 
                            : plan.popular 
                              ? 'bg-white/5 border-emerald-500/50' 
                              : 'bg-white/5 border-white/10'
                        }`}
                      >
                        {plan.popular && (
                          <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full mb-3 inline-block">
                            Most Popular
                          </span>
                        )}
                        <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                        <div className="mt-2 mb-4">
                          <span className="text-3xl font-bold text-white">${plan.price}</span>
                          <span className="text-gray-400">/mo</span>
                        </div>
                        <ul className="space-y-2 mb-6">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                              <span className="text-emerald-400">✓</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <button
                          onClick={() => handleChangePlan(plan.id)}
                          disabled={billing.plan === plan.id}
                          className={`w-full py-2 rounded-lg font-medium transition ${
                            billing.plan === plan.id
                              ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                          }`}
                        >
                          {billing.plan === plan.id ? 'Current Plan' : 'Select Plan'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Method */}
                <div className="bg-white/10 backdrop-blur rounded-xl border border-white/10 p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">Payment Method</h2>
                  {billing.cardLast4 ? (
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center">
                          💳
                        </div>
                        <div>
                          <div className="font-medium text-white">
                            {billing.cardBrand} •••• {billing.cardLast4}
                          </div>
                          <div className="text-sm text-gray-400">
                            Next billing: {billing.nextBillingDate}
                          </div>
                        </div>
                      </div>
                      <button className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
                        Update
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-400 mb-4">No payment method on file</p>
                      <button 
                        onClick={() => updateBilling({ 
                          ...billing, 
                          cardLast4: '4242', 
                          cardBrand: 'Visa',
                          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
                        })}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition"
                      >
                        Add Payment Method
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

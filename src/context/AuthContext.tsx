'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  User,
  BusinessProfile,
  NexusState,
  TaxCalculation,
  FilingDeadline,
  ConnectedPlatform,
  NotificationPreferences,
  BillingInfo,
} from '@/types';

// Types for API responses
interface ApiUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: string;
  subscription?: {
    plan: string;
    status: string;
    currentPeriodEnd?: string;
  } | null;
}

interface AuthContextType {
  user: User | null;
  businessProfile: BusinessProfile | null;
  nexusStates: NexusState[];
  calculations: TaxCalculation[];
  filingDeadlines: FilingDeadline[];
  connectedPlatforms: ConnectedPlatform[];
  notifications: NotificationPreferences;
  billing: BillingInfo;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshData: () => Promise<void>;
  updateBusinessProfile: (profile: Partial<BusinessProfile> & { name: string }) => Promise<{ success: boolean; error?: string }>;
  updateNexusStates: (states: NexusState[]) => Promise<{ success: boolean; error?: string }>;
  addCalculation: (calc: TaxCalculation) => void;
  addCalculations: (calcs: TaxCalculation[]) => void;
  clearCalculations: () => Promise<void>;
  updateFilingDeadline: (id: string, status: FilingDeadline['status']) => Promise<{ success: boolean; error?: string }>;
  updateNotifications: (prefs: NotificationPreferences) => Promise<{ success: boolean; error?: string }>;
  updateBilling: (billing: BillingInfo) => void;
  updateUser: (user: Partial<User>) => void;
  sendVerificationEmail: () => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (token: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

const defaultNotifications: NotificationPreferences = {
  emailDeadlineReminders: true,
  emailWeeklyDigest: true,
  emailNewRates: false,
  pushDeadlines: true,
  reminderDaysBefore: 7,
};

const defaultBilling: BillingInfo = {
  plan: 'free',
  monthlyPrice: 0,
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [nexusStates, setNexusStates] = useState<NexusState[]>([]);
  const [calculations, setCalculations] = useState<TaxCalculation[]>([]);
  const [filingDeadlines, setFilingDeadlines] = useState<FilingDeadline[]>([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState<ConnectedPlatform[]>([]);
  const [notifications, setNotifications] = useState<NotificationPreferences>(defaultNotifications);
  const [billing, setBilling] = useState<BillingInfo>(defaultBilling);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all user data from APIs
  const fetchUserData = useCallback(async () => {
    try {
      const [businessRes, nexusRes, filingsRes, calculationsRes, notificationsRes, platformsRes] = await Promise.allSettled([
        fetch('/api/business'),
        fetch('/api/nexus'),
        fetch('/api/filings'),
        fetch('/api/calculations?limit=100'),
        fetch('/api/notifications'),
        fetch('/api/platforms'),
      ]);

      // Process business profile
      if (businessRes.status === 'fulfilled' && businessRes.value.ok) {
        const data = await businessRes.value.json();
        if (data.business) {
          setBusinessProfile({
            name: data.business.name,
            address: data.business.address || '',
            city: data.business.city || '',
            state: data.business.state || '',
            zip: data.business.zip || '',
            businessType: data.business.businessType || 'ecommerce',
            ein: data.business.ein || '',
            id: data.business.id,
          });
        }
      }

      // Process nexus states
      if (nexusRes.status === 'fulfilled' && nexusRes.value.ok) {
        const data = await nexusRes.value.json();
        if (data.nexusStates) {
          setNexusStates(data.nexusStates);
        }
      }

      // Process filings
      if (filingsRes.status === 'fulfilled' && filingsRes.value.ok) {
        const data = await filingsRes.value.json();
        if (data.filings) {
          setFilingDeadlines(data.filings.map((f: { id: string; state: string; stateCode: string; period: string; dueDate: string; status: string; estimatedTax: number | null }) => ({
            id: f.id,
            state: f.state,
            stateCode: f.stateCode,
            period: f.period,
            dueDate: f.dueDate,
            status: f.status,
            estimatedTax: f.estimatedTax,
          })));
        }
      }

      // Process calculations
      if (calculationsRes.status === 'fulfilled' && calculationsRes.value.ok) {
        const data = await calculationsRes.value.json();
        if (data.calculations) {
          setCalculations(data.calculations);
        }
      }

      // Process notifications
      if (notificationsRes.status === 'fulfilled' && notificationsRes.value.ok) {
        const data = await notificationsRes.value.json();
        if (data.preferences) {
          setNotifications({
            ...defaultNotifications,
            ...data.preferences,
          });
        }
      }

      // Process platforms
      if (platformsRes.status === 'fulfilled' && platformsRes.value.ok) {
        const data = await platformsRes.value.json();
        if (data.platforms) {
          setConnectedPlatforms(data.platforms.map((p: { platform: string; name: string; connectedCount: number; connections: { id: string; platformName: string }[] }) => ({
            id: p.platform,
            name: p.name,
            type: p.platform,
            connected: p.connectedCount > 0,
            connectedAt: p.connections[0]?.id ? new Date().toISOString() : undefined,
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, []);

  // Check for existing session on mount
  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        const apiUser: ApiUser = data.user;
        
        setUser({
          id: apiUser.id,
          email: apiUser.email,
          name: apiUser.name,
          createdAt: apiUser.createdAt,
          emailVerified: apiUser.emailVerified,
        });

        // Update billing from subscription
        if (apiUser.subscription) {
          setBilling(prev => ({
            ...prev,
            plan: apiUser.subscription!.plan as BillingInfo['plan'],
          }));
        }

        // Fetch all other user data
        await fetchUserData();
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    }
  }, [fetchUserData]);

  // Refresh just the data (not auth)
  const refreshData = useCallback(async () => {
    if (user) {
      await fetchUserData();
    }
  }, [user, fetchUserData]);

  useEffect(() => {
    const init = async () => {
      await refreshUser();
      setIsLoading(false);
    };
    init();
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      // Clear any stale state from previous sessions before setting new user
      setBusinessProfile(null);
      setNexusStates([]);
      setCalculations([]);
      setFilingDeadlines([]);
      setConnectedPlatforms([]);
      setNotifications(defaultNotifications);
      setBilling(defaultBilling);

      setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        createdAt: data.user.createdAt,
        emailVerified: data.user.emailVerified,
      });

      // Fetch all user data after login
      await fetchUserData();

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An error occurred during login' };
    }
  };

  const signup = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Signup failed' };
      }

      // Clear any stale state from previous sessions
      setBusinessProfile(null);
      setNexusStates([]);
      setCalculations([]);
      setFilingDeadlines([]);
      setConnectedPlatforms([]);
      setNotifications(defaultNotifications);
      setBilling(defaultBilling);

      setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        createdAt: data.user.createdAt,
        emailVerified: data.user.emailVerified,
      });

      // Fetch fresh data for new user (will be empty but ensures clean state)
      await fetchUserData();

      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'An error occurred during signup' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }

    setUser(null);
    setBusinessProfile(null);
    setNexusStates([]);
    setCalculations([]);
    setFilingDeadlines([]);
    setConnectedPlatforms([]);
    setNotifications(defaultNotifications);
    setBilling(defaultBilling);
  };

  const sendVerificationEmail = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/email/send-verification', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to send verification email' };
      }

      return { success: true };
    } catch (error) {
      console.error('Send verification error:', error);
      return { success: false, error: 'An error occurred' };
    }
  };

  const forgotPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/email/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to send reset email' };
      }

      return { success: true };
    } catch (error) {
      console.error('Forgot password error:', error);
      return { success: false, error: 'An error occurred' };
    }
  };

  const resetPassword = async (token: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/email/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to reset password' };
      }

      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: 'An error occurred' };
    }
  };

  const updateBusinessProfile = async (profile: Partial<BusinessProfile> & { name: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      const method = businessProfile?.id ? 'PUT' : 'POST';
      const body = businessProfile?.id 
        ? { id: businessProfile.id, ...profile }
        : profile;

      const response = await fetch('/api/business', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to update business profile' };
      }

      setBusinessProfile({
        ...profile,
        id: data.business.id,
      } as BusinessProfile);

      return { success: true };
    } catch (error) {
      console.error('Update business profile error:', error);
      return { success: false, error: 'An error occurred' };
    }
  };

  const updateNexusStates = async (states: NexusState[]): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/nexus', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          states: states.map(s => ({
            stateCode: s.stateCode,
            hasNexus: s.hasNexus,
            nexusType: s.nexusType,
            registrationNumber: s.registrationNumber,
            registrationDate: s.registrationDate,
          }))
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to update nexus states' };
      }

      if (data.nexusStates) {
        setNexusStates(data.nexusStates);
      }

      // Refresh filings since they depend on nexus states
      const filingsRes = await fetch('/api/filings');
      if (filingsRes.ok) {
        const filingsData = await filingsRes.json();
        if (filingsData.filings) {
          setFilingDeadlines(filingsData.filings);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Update nexus states error:', error);
      return { success: false, error: 'An error occurred' };
    }
  };

  const addCalculation = (calc: TaxCalculation) => {
    // Add to local state immediately for UI
    setCalculations(prev => [calc, ...prev].slice(0, 100));
    
    // Save to API in background
    fetch('/api/calculations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: calc.amount,
        stateCode: calc.stateCode,
        stateName: calc.state,
        category: calc.category || 'general',
        taxRate: calc.rate / 100, // Convert percentage to decimal
        taxAmount: calc.taxAmount,
        total: calc.amount + calc.taxAmount,
        source: 'manual',
      }),
    }).catch(err => console.error('Failed to save calculation:', err));
  };

  const addCalculations = (calcs: TaxCalculation[]) => {
    setCalculations(prev => [...calcs, ...prev].slice(0, 500));
    
    // Save to API in background
    fetch('/api/calculations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        calculations: calcs.map(calc => ({
          amount: calc.amount,
          stateCode: calc.stateCode,
          stateName: calc.state,
          category: calc.category || 'general',
          taxRate: calc.rate / 100,
          taxAmount: calc.taxAmount,
          total: calc.amount + calc.taxAmount,
          source: 'import',
        })),
      }),
    }).catch(err => console.error('Failed to save calculations:', err));
  };

  const clearCalculations = async () => {
    try {
      await fetch('/api/calculations?clearAll=true', { method: 'DELETE' });
      setCalculations([]);
    } catch (error) {
      console.error('Failed to clear calculations:', error);
    }
  };

  const updateFilingDeadline = async (id: string, status: FilingDeadline['status']): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/filings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to update filing' };
      }

      setFilingDeadlines(prev => prev.map(d => d.id === id ? { ...d, status } : d));

      return { success: true };
    } catch (error) {
      console.error('Update filing error:', error);
      return { success: false, error: 'An error occurred' };
    }
  };

  const updateNotifications = async (prefs: NotificationPreferences): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to update notifications' };
      }

      setNotifications(prefs);

      return { success: true };
    } catch (error) {
      console.error('Update notifications error:', error);
      return { success: false, error: 'An error occurred' };
    }
  };

  const updateBilling = (newBilling: BillingInfo) => {
    setBilling(newBilling);
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      businessProfile,
      nexusStates,
      calculations,
      filingDeadlines,
      connectedPlatforms,
      notifications,
      billing,
      isLoading,
      isAuthenticated: !!user,
      login,
      signup,
      logout,
      refreshUser,
      refreshData,
      updateBusinessProfile,
      updateNexusStates,
      addCalculation,
      addCalculations,
      clearCalculations,
      updateFilingDeadline,
      updateNotifications,
      updateBilling,
      updateUser,
      sendVerificationEmail,
      forgotPassword,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

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
  updateBusinessProfile: (profile: BusinessProfile) => void;
  updateNexusStates: (states: NexusState[]) => void;
  addCalculation: (calc: TaxCalculation) => void;
  addCalculations: (calcs: TaxCalculation[]) => void;
  clearCalculations: () => void;
  updateFilingDeadline: (id: string, status: FilingDeadline['status']) => void;
  togglePlatformConnection: (id: string) => void;
  updateNotifications: (prefs: NotificationPreferences) => void;
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
  plan: 'starter',
  monthlyPrice: 29,
};

const defaultPlatforms: ConnectedPlatform[] = [
  { id: '1', name: 'Shopify', type: 'shopify', connected: false },
  { id: '2', name: 'Amazon', type: 'amazon', connected: false },
  { id: '3', name: 'Etsy', type: 'etsy', connected: false },
  { id: '4', name: 'WooCommerce', type: 'woocommerce', connected: false },
  { id: '5', name: 'BigCommerce', type: 'bigcommerce', connected: false },
  { id: '6', name: 'eBay', type: 'ebay', connected: false },
  { id: '7', name: 'Square', type: 'square', connected: false },
];

const generateFilingDeadlines = (nexusStates: NexusState[]): FilingDeadline[] => {
  const deadlines: FilingDeadline[] = [];
  const now = new Date();
  
  nexusStates.filter(s => s.hasNexus).forEach((state) => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const quarterEndMonths = [3, 6, 9, 12];
    const currentQuarter = Math.floor(now.getMonth() / 3);
    
    const nextQuarterEnd = quarterEndMonths[(currentQuarter + 1) % 4];
    const year = currentQuarter === 3 ? now.getFullYear() + 1 : now.getFullYear();
    const dueDate = new Date(year, nextQuarterEnd, 20);
    
    deadlines.push({
      id: `${state.stateCode}-${year}-${quarters[(currentQuarter + 1) % 4]}`,
      state: state.state,
      stateCode: state.stateCode,
      period: 'quarterly',
      dueDate: dueDate.toISOString(),
      status: 'pending',
      estimatedTax: Math.floor(Math.random() * 5000) + 500,
    });
  });
  
  return deadlines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [nexusStates, setNexusStates] = useState<NexusState[]>([]);
  const [calculations, setCalculations] = useState<TaxCalculation[]>([]);
  const [filingDeadlines, setFilingDeadlines] = useState<FilingDeadline[]>([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState<ConnectedPlatform[]>(defaultPlatforms);
  const [notifications, setNotifications] = useState<NotificationPreferences>(defaultNotifications);
  const [billing, setBilling] = useState<BillingInfo>(defaultBilling);
  const [isLoading, setIsLoading] = useState(true);

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

        // Load other data from localStorage (will be migrated to DB later)
        const savedState = localStorage.getItem('salestaxjar_state');
        if (savedState) {
          const state = JSON.parse(savedState);
          if (state.businessProfile) setBusinessProfile(state.businessProfile);
          if (state.nexusStates) setNexusStates(state.nexusStates);
          if (state.calculations) setCalculations(state.calculations);
          if (state.filingDeadlines) setFilingDeadlines(state.filingDeadlines);
          if (state.connectedPlatforms) setConnectedPlatforms(state.connectedPlatforms);
          if (state.notifications) setNotifications(state.notifications);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await refreshUser();
      setIsLoading(false);
    };
    init();
  }, [refreshUser]);

  // Save state to localStorage whenever it changes (non-auth data)
  useEffect(() => {
    if (!isLoading && user) {
      const state = {
        businessProfile,
        nexusStates,
        calculations,
        filingDeadlines,
        connectedPlatforms,
        notifications,
      };
      localStorage.setItem('salestaxjar_state', JSON.stringify(state));
    }
  }, [businessProfile, nexusStates, calculations, filingDeadlines, connectedPlatforms, notifications, isLoading, user]);

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

      setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        createdAt: data.user.createdAt,
        emailVerified: data.user.emailVerified,
      });

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

      setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        createdAt: data.user.createdAt,
        emailVerified: data.user.emailVerified,
      });

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
    setConnectedPlatforms(defaultPlatforms);
    setNotifications(defaultNotifications);
    setBilling(defaultBilling);
    localStorage.removeItem('salestaxjar_state');
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

  const updateBusinessProfile = (profile: BusinessProfile) => {
    setBusinessProfile(profile);
  };

  const updateNexusStates = (states: NexusState[]) => {
    setNexusStates(states);
    setFilingDeadlines(generateFilingDeadlines(states));
  };

  const addCalculation = (calc: TaxCalculation) => {
    setCalculations(prev => [calc, ...prev].slice(0, 100));
  };

  const addCalculations = (calcs: TaxCalculation[]) => {
    setCalculations(prev => [...calcs, ...prev].slice(0, 500));
  };

  const clearCalculations = () => {
    setCalculations([]);
  };

  const updateFilingDeadline = (id: string, status: FilingDeadline['status']) => {
    setFilingDeadlines(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  };

  const togglePlatformConnection = (id: string) => {
    setConnectedPlatforms(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          connected: !p.connected,
          connectedAt: !p.connected ? new Date().toISOString() : undefined,
          ordersImported: !p.connected ? Math.floor(Math.random() * 1000) + 50 : undefined,
          lastSync: !p.connected ? new Date().toISOString() : undefined,
        };
      }
      return p;
    }));
  };

  const updateNotifications = (prefs: NotificationPreferences) => {
    setNotifications(prefs);
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
      updateBusinessProfile,
      updateNexusStates,
      addCalculation,
      addCalculations,
      clearCalculations,
      updateFilingDeadline,
      togglePlatformConnection,
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

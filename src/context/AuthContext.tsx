'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  BusinessProfile,
  NexusState,
  TaxCalculation,
  FilingDeadline,
  ConnectedPlatform,
  NotificationPreferences,
  BillingInfo,
  AppState,
} from '@/types';

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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
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
  
  nexusStates.filter(s => s.hasNexus).forEach((state, index) => {
    // Generate quarterly deadlines for each nexus state
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const quarterEndMonths = [3, 6, 9, 12];
    const currentQuarter = Math.floor(now.getMonth() / 3);
    
    // Add next filing deadline
    const nextQuarterEnd = quarterEndMonths[(currentQuarter + 1) % 4];
    const year = currentQuarter === 3 ? now.getFullYear() + 1 : now.getFullYear();
    const dueDate = new Date(year, nextQuarterEnd, 20); // Due 20th of month after quarter ends
    
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

  // Load state from localStorage on mount
  useEffect(() => {
    const loadState = () => {
      try {
        const savedState = localStorage.getItem('salestaxjar_state');
        if (savedState) {
          const state: AppState = JSON.parse(savedState);
          setUser(state.user);
          setBusinessProfile(state.businessProfile);
          setNexusStates(state.nexusStates || []);
          setCalculations(state.calculations || []);
          setFilingDeadlines(state.filingDeadlines || []);
          setConnectedPlatforms(state.connectedPlatforms || defaultPlatforms);
          setNotifications(state.notifications || defaultNotifications);
          setBilling(state.billing || defaultBilling);
        }
      } catch (e) {
        console.error('Failed to load state:', e);
      }
      setIsLoading(false);
    };
    loadState();
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      const state: AppState = {
        user,
        businessProfile,
        nexusStates,
        calculations,
        filingDeadlines,
        connectedPlatforms,
        notifications,
        billing,
      };
      localStorage.setItem('salestaxjar_state', JSON.stringify(state));
    }
  }, [user, businessProfile, nexusStates, calculations, filingDeadlines, connectedPlatforms, notifications, billing, isLoading]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Check for existing user in localStorage
    const users = JSON.parse(localStorage.getItem('salestaxjar_users') || '[]');
    const existingUser = users.find((u: any) => u.email === email);
    
    if (!existingUser) {
      return { success: false, error: 'No account found with this email' };
    }
    
    if (existingUser.password !== password) {
      return { success: false, error: 'Incorrect password' };
    }
    
    const loggedInUser: User = {
      id: existingUser.id,
      email: existingUser.email,
      name: existingUser.name,
      createdAt: existingUser.createdAt,
    };
    
    setUser(loggedInUser);
    return { success: true };
  };

  const signup = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Check if email already exists
    const users = JSON.parse(localStorage.getItem('salestaxjar_users') || '[]');
    if (users.some((u: any) => u.email === email)) {
      return { success: false, error: 'An account with this email already exists' };
    }
    
    const newUser = {
      id: crypto.randomUUID(),
      email,
      password,
      name,
      createdAt: new Date().toISOString(),
    };
    
    users.push(newUser);
    localStorage.setItem('salestaxjar_users', JSON.stringify(users));
    
    const loggedInUser: User = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      createdAt: newUser.createdAt,
    };
    
    setUser(loggedInUser);
    return { success: true };
  };

  const logout = () => {
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

  const updateBusinessProfile = (profile: BusinessProfile) => {
    setBusinessProfile(profile);
  };

  const updateNexusStates = (states: NexusState[]) => {
    setNexusStates(states);
    setFilingDeadlines(generateFilingDeadlines(states));
  };

  const addCalculation = (calc: TaxCalculation) => {
    setCalculations(prev => [calc, ...prev].slice(0, 100)); // Keep last 100
  };

  const addCalculations = (calcs: TaxCalculation[]) => {
    setCalculations(prev => [...calcs, ...prev].slice(0, 500)); // Keep last 500
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
      // Also update in users array
      const users = JSON.parse(localStorage.getItem('salestaxjar_users') || '[]');
      const updatedUsers = users.map((u: any) => 
        u.id === user.id ? { ...u, ...updates } : u
      );
      localStorage.setItem('salestaxjar_users', JSON.stringify(updatedUsers));
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
      login,
      signup,
      logout,
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

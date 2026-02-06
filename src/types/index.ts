// User and Auth types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  emailVerified?: boolean;
}

export interface BusinessProfile {
  id?: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  businessType: 'retail' | 'ecommerce' | 'services' | 'manufacturing' | 'wholesale' | 'other' | string;
  ein?: string;
}

export interface NexusState {
  id?: string;
  stateCode: string;
  state: string;
  hasNexus: boolean;
  nexusType?: 'physical' | 'economic' | 'affiliate' | 'click-through' | 'marketplace' | string | null;
  registrationNumber?: string;
  registrationDate?: string;
}

export interface TaxCalculation {
  id: string;
  date: string;
  amount: number;
  state: string;
  stateCode: string;
  category: ProductCategory;
  taxAmount: number;
  total: number;
  rate: number;
}

export type ProductCategory = 
  | 'general'
  | 'clothing'
  | 'food_grocery'
  | 'food_prepared'
  | 'digital_goods'
  | 'software'
  | 'medical'
  | 'electronics';

export const productCategories: { value: ProductCategory; label: string; description: string }[] = [
  { value: 'general', label: 'General Merchandise', description: 'Standard taxable goods' },
  { value: 'clothing', label: 'Clothing & Apparel', description: 'Some states exempt clothing under $110' },
  { value: 'food_grocery', label: 'Groceries', description: 'Unprepared food - often exempt or reduced rate' },
  { value: 'food_prepared', label: 'Prepared Food', description: 'Restaurant food, ready-to-eat items' },
  { value: 'digital_goods', label: 'Digital Goods', description: 'Downloads, streaming, digital content' },
  { value: 'software', label: 'Software (SaaS)', description: 'Software licenses and subscriptions' },
  { value: 'medical', label: 'Medical/Health', description: 'OTC drugs, medical equipment' },
  { value: 'electronics', label: 'Electronics', description: 'Computers, phones, gadgets' },
];

// Category-based tax rate modifiers by state
export const categoryModifiers: Record<string, Partial<Record<ProductCategory, number>>> = {
  // States with clothing exemptions and grocery exemptions combined
  NY: { clothing: 0, food_grocery: 0 }, // Clothing exempt under $110, groceries exempt
  PA: { clothing: 0 },
  NJ: { clothing: 0 },
  MN: { clothing: 0 },
  // States with grocery exemptions
  TX: { food_grocery: 0 },
  CA: { food_grocery: 0 },
  FL: { food_grocery: 0, medical: 0 },
  // States where digital goods are exempt (no sales tax states)
  MT: { digital_goods: 0, software: 0 },
  OR: { digital_goods: 0, software: 0 },
  // Reduced rates
  IL: { food_grocery: 0.5 }, // 50% of normal rate
  VA: { food_grocery: 0.4 },
};

export interface FilingDeadline {
  id: string;
  state: string;
  stateCode: string;
  period: 'monthly' | 'quarterly' | 'annual';
  dueDate: string;
  status: 'pending' | 'filed' | 'overdue';
  estimatedTax?: number;
}

export interface ConnectedPlatform {
  id: string;
  name: string;
  type: 'shopify' | 'amazon' | 'etsy' | 'woocommerce' | 'bigcommerce' | 'ebay' | 'square';
  connected: boolean;
  connectedAt?: string;
  ordersImported?: number;
  lastSync?: string;
}

export interface NotificationPreferences {
  emailDeadlineReminders: boolean;
  emailWeeklyDigest: boolean;
  emailNewRates: boolean;
  pushDeadlines: boolean;
  reminderDaysBefore: number;
}

export interface BillingInfo {
  plan: 'free' | 'starter' | 'pro' | 'business';
  cardLast4?: string;
  cardBrand?: string;
  nextBillingDate?: string;
  monthlyPrice: number;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string;
}

export interface AppState {
  user: User | null;
  businessProfile: BusinessProfile | null;
  nexusStates: NexusState[];
  calculations: TaxCalculation[];
  filingDeadlines: FilingDeadline[];
  connectedPlatforms: ConnectedPlatform[];
  notifications: NotificationPreferences;
  billing: BillingInfo;
}

// API Request Types
export interface TaxCalculateRequest {
  amount: number;
  stateCode: string;
  category?: ProductCategory;
  zipCode?: string;
  city?: string;
  shipping?: number;
}

export interface TaxCalculateResponse {
  success: boolean;
  amount: number;
  stateCode: string;
  state: string;
  rate: number;
  taxAmount: number;
  total: number;
  category: ProductCategory;
  breakdown?: {
    stateRate: number;
    countyRate: number;
    cityRate: number;
    specialRate: number;
  };
  calculationId?: string;
}

export interface ApiKeyCreateRequest {
  name: string;
  permissions?: ApiKeyPermission[];
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: ApiKeyPermission[];
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
}

export type ApiKeyPermission = 'calculate' | 'rates' | 'nexus' | 'filings';

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Calculation History
export interface CalculationHistoryRequest {
  startDate?: string;
  endDate?: string;
  stateCode?: string;
  category?: ProductCategory;
  page?: number;
  pageSize?: number;
}

export interface CalculationSummary {
  totalCalculations: number;
  totalAmount: number;
  totalTax: number;
  byState: Record<string, { count: number; amount: number; tax: number }>;
  byCategory: Record<ProductCategory, { count: number; amount: number; tax: number }>;
  period: { start: string; end: string };
}

// Platform Integration Types
export interface PlatformConnectRequest {
  platform: ConnectedPlatform['type'];
  credentials: ShopifyCredentials | WooCommerceCredentials | BigCommerceCredentials;
}

export interface ShopifyCredentials {
  shopDomain: string;
  accessToken: string;
}

export interface WooCommerceCredentials {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export interface BigCommerceCredentials {
  storeHash: string;
  accessToken: string;
  clientId: string;
}

export interface PlatformSyncResponse {
  success: boolean;
  ordersImported: number;
  ordersSkipped: number;
  errors?: string[];
  lastOrderDate?: string;
}

// Nexus Alert Types
export interface NexusAlert {
  id: string;
  stateCode: string;
  state: string;
  thresholdType: 'revenue' | 'transactions';
  currentValue: number;
  threshold: number;
  percentOfThreshold: number;
  status: 'approaching' | 'exceeded' | 'safe';
  createdAt: string;
}

export interface NexusExposure {
  stateCode: string;
  state: string;
  hasPhysicalNexus: boolean;
  hasEconomicNexus: boolean;
  revenue: number;
  transactions: number;
  revenueThreshold: number;
  transactionThreshold: number;
  isRegistered: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// Error Response
export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, string>;
}

// Stripe/Billing Types
export interface CreateCheckoutRequest {
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface SubscriptionStatus {
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  plan: BillingInfo['plan'];
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

// Usage Tracking
export interface UsageStats {
  currentPeriod: {
    calculations: number;
    apiCalls: number;
    ordersImported: number;
  };
  limits: {
    calculations: number;
    apiCalls: number;
    ordersImported: number;
  };
  percentUsed: {
    calculations: number;
    apiCalls: number;
    ordersImported: number;
  };
  resetDate: string;
}

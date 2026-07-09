// User and Auth types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  emailVerified?: boolean;
  isBetaUser?: boolean;
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

// Category-based tax rate modifiers by state (LOCAL FALLBACK ONLY).
//
// This table is only used when the TaxJar API is unconfigured or unreachable.
// In production, TaxJar applies each state's real category rules via
// product_tax_code (see src/lib/taxjar.ts). This fallback is a deliberate
// SIMPLIFICATION and is intentionally CONSERVATIVE: a category is only given a
// reduced/zero modifier when the exemption is well-documented and broadly
// applicable. When a state's category rule is uncertain or highly location-
// dependent, we leave the item taxed at the full combined rate (safe
// over-collection) rather than guessing an exemption.
//
// `modifier` multiplies the state's combined rate. 0 = fully exempt.
// Sources verified 2026-07 (Tax Foundation, state DORs, TaxJar). See notes per state.
export const categoryModifiers: Record<string, Partial<Record<ProductCategory, number>>> = {
  // --- Clothing exemptions ---
  // NY: clothing/footwear under $110 exempt from the 4% state rate (many
  // localities also exempt); groceries (unprepared food) exempt statewide.
  // Simplified to full exemption for the fallback.
  NY: { clothing: 0, food_grocery: 0 },
  PA: { clothing: 0 }, // Most clothing exempt (PA DOR).
  NJ: { clothing: 0 }, // Most clothing exempt (NJ Div. of Taxation).
  MN: { clothing: 0 }, // Clothing exempt (MN DOR).

  // --- Grocery (unprepared food) exemptions ---
  TX: { food_grocery: 0 }, // Grocery food exempt (TX Comptroller).
  CA: { food_grocery: 0 }, // Most grocery food exempt (CDTFA).
  FL: { food_grocery: 0, medical: 0 }, // Grocery food + most drugs/medical exempt (FL DOR).

  // --- No-sales-tax states: everything untaxed (kept for category display) ---
  MT: { digital_goods: 0, software: 0 },
  OR: { digital_goods: 0, software: 0 },

  // --- Grocery reduced / local-only rates (CORRECTED 2026) ---
  // IL: The 1% STATE grocery tax was ELIMINATED effective Jan 1, 2026. The state
  // rate on groceries is now 0%; municipalities/counties may impose a local
  // grocery tax of up to 1% (200+ had adopted one by mid-2025). Conservatively
  // model groceries at ~1% (the local option) rather than 0. combinedRate 8.82%,
  // so modifier ~= 1.0/8.82. (Old value 0.5 -> ~4.4% was stale/wrong.)
  // Source: IL DOR Bulletin FY 2026-03; Avalara; WTTW (2025-12-26).
  IL: { food_grocery: 0.113 }, // ~1.0% effective
  // VA: State grocery tax removed Jan 1, 2023; groceries + essential hygiene
  // products taxed at a flat 1% LOCAL rate statewide. combinedRate 5.75%, so
  // modifier ~= 1.0/5.75. (Old value 0.4 -> ~2.3% was wrong.)
  // Source: Virginia Tax "Grocery Tax" (tax.virginia.gov/grocery-tax).
  VA: { food_grocery: 0.174 }, // ~1.0% effective
  // KS: State food sales tax reached 0% on Jan 1, 2025 (phased down from 6.5%).
  // Local sales taxes still apply to food, so groceries are taxed at the local
  // rate only. combinedRate 8.69%, avgLocal 2.19%, so modifier ~= 2.19/8.69.
  // Source: KS Dept. of Revenue Pub. KS-1223; Office of the Governor (2025).
  KS: { food_grocery: 0.252 }, // ~2.19% effective (local only)
};

export interface FilingDeadline {
  id: string;
  state: string;
  stateCode: string;
  period: 'monthly' | 'quarterly' | 'annual';
  dueDate: string;
  status: 'pending' | 'filed' | 'overdue';
  estimatedTax?: number;
  actualTax?: number;
  confirmationNumber?: string;
  filedAt?: string;
  notes?: string;
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

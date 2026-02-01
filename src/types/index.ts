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

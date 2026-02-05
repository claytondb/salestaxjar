/**
 * Plan Features & Tier Gating
 * 
 * Centralized plan-checking utility for Sails.tax
 * 
 * Plan hierarchy:
 *   free → starter ($9) → pro ($29) → business ($59)
 * 
 * Free users get:
 *   - Nexus monitoring (all states)
 *   - Tax calculator
 *   - Calculation history + CSV export
 * 
 * Starter adds:
 *   - Shopify & WooCommerce integrations
 *   - Order import / sync
 *   - Email deadline reminders
 *   - CSV order import
 * 
 * Pro adds:
 *   - All platform integrations (Amazon, BigCommerce, Squarespace, etc.)
 *   - API key creation
 *   - Priority support
 * 
 * Business adds:
 *   - Everything
 *   - Highest priority support
 *   - Early access to features
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanTier = 'free' | 'starter' | 'pro' | 'business';

export type Feature =
  // Free features
  | 'nexus_monitoring'
  | 'tax_calculator'
  | 'calculation_history'
  | 'csv_export'
  // Starter features
  | 'platform_shopify'
  | 'platform_woocommerce'
  | 'order_import'
  | 'order_sync'
  | 'email_deadline_reminders'
  | 'csv_order_import'
  // Pro features
  | 'platform_amazon'
  | 'platform_bigcommerce'
  | 'platform_squarespace'
  | 'platform_ecwid'
  | 'platform_magento'
  | 'platform_opencart'
  | 'platform_prestashop'
  | 'platform_etsy'
  | 'all_platforms'
  | 'api_keys'
  | 'priority_support'
  // Business features
  | 'auto_filing'
  | 'highest_priority_support'
  | 'early_access';

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

const PLAN_TIER_ORDER: PlanTier[] = ['free', 'starter', 'pro', 'business'];

/** Minimum plan tier required for each feature */
const FEATURE_MINIMUM_TIER: Record<Feature, PlanTier> = {
  // Free
  nexus_monitoring: 'free',
  tax_calculator: 'free',
  calculation_history: 'free',
  csv_export: 'free',

  // Starter
  platform_shopify: 'starter',
  platform_woocommerce: 'starter',
  order_import: 'starter',
  order_sync: 'starter',
  email_deadline_reminders: 'starter',
  csv_order_import: 'starter',

  // Pro
  platform_amazon: 'pro',
  platform_bigcommerce: 'pro',
  platform_squarespace: 'pro',
  platform_ecwid: 'pro',
  platform_magento: 'pro',
  platform_opencart: 'pro',
  platform_prestashop: 'pro',
  platform_etsy: 'pro',
  all_platforms: 'pro',
  api_keys: 'pro',
  priority_support: 'pro',

  // Business
  auto_filing: 'business',
  highest_priority_support: 'business',
  early_access: 'business',
};

/**
 * Map platform slug → feature name for gating checks
 */
const PLATFORM_FEATURE_MAP: Record<string, Feature> = {
  shopify: 'platform_shopify',
  woocommerce: 'platform_woocommerce',
  amazon: 'platform_amazon',
  bigcommerce: 'platform_bigcommerce',
  squarespace: 'platform_squarespace',
  ecwid: 'platform_ecwid',
  magento: 'platform_magento',
  opencart: 'platform_opencart',
  prestashop: 'platform_prestashop',
  etsy: 'platform_etsy',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the numeric index of a plan tier (higher = more features) */
export function getPlanLevel(tier: PlanTier): number {
  return PLAN_TIER_ORDER.indexOf(tier);
}

/**
 * Resolve a user's effective plan tier.
 * 
 * A user is on the free plan if:
 *   - They have no subscription record
 *   - Their subscription status is not 'active' (and not 'trialing')
 */
export function resolveUserPlan(subscription: {
  plan?: string | null;
  status?: string | null;
} | null | undefined): PlanTier {
  if (!subscription) return 'free';
  
  const { plan, status } = subscription;
  
  // Only active or trialing subscriptions count
  if (status !== 'active' && status !== 'trialing') return 'free';
  
  // Validate plan name
  if (plan === 'starter' || plan === 'pro' || plan === 'business') {
    return plan;
  }
  
  return 'free';
}

/**
 * Get all features available for a given plan tier.
 */
export function getPlanFeatures(tier: PlanTier): Feature[] {
  const tierLevel = getPlanLevel(tier);
  
  return (Object.entries(FEATURE_MINIMUM_TIER) as [Feature, PlanTier][])
    .filter(([, minTier]) => getPlanLevel(minTier) <= tierLevel)
    .map(([feature]) => feature);
}

/**
 * Check whether a plan tier can access a specific feature.
 */
export function canAccessFeature(tier: PlanTier, feature: Feature): boolean {
  const requiredLevel = getPlanLevel(FEATURE_MINIMUM_TIER[feature]);
  const userLevel = getPlanLevel(tier);
  return userLevel >= requiredLevel;
}

/**
 * Check whether a plan tier can connect a specific platform.
 * Returns { allowed, requiredPlan } for detailed error messages.
 */
export function canConnectPlatform(
  tier: PlanTier,
  platform: string
): { allowed: boolean; requiredPlan: PlanTier } {
  const feature = PLATFORM_FEATURE_MAP[platform.toLowerCase()];
  
  if (!feature) {
    // Unknown platform — deny by default, require pro
    return { allowed: false, requiredPlan: 'pro' };
  }
  
  const requiredTier = FEATURE_MINIMUM_TIER[feature];
  const allowed = getPlanLevel(tier) >= getPlanLevel(requiredTier);
  
  return { allowed, requiredPlan: requiredTier };
}

/**
 * Get the minimum plan required for a feature (for upgrade prompts).
 */
export function getRequiredPlan(feature: Feature): PlanTier {
  return FEATURE_MINIMUM_TIER[feature];
}

/**
 * Human-readable plan name.
 */
export function getPlanDisplayName(tier: PlanTier): string {
  switch (tier) {
    case 'free': return 'Free';
    case 'starter': return 'Starter';
    case 'pro': return 'Pro';
    case 'business': return 'Business';
  }
}

/**
 * Convenience: resolve user plan from the getCurrentUser() result shape
 * and check a feature in one call. Used in API routes.
 */
export function userCanAccess(
  user: { subscription?: { plan?: string | null; status?: string | null } | null } | null,
  feature: Feature
): { allowed: boolean; userPlan: PlanTier; requiredPlan: PlanTier } {
  const userPlan = resolveUserPlan(user?.subscription);
  const requiredPlan = FEATURE_MINIMUM_TIER[feature];
  const allowed = canAccessFeature(userPlan, feature);
  return { allowed, userPlan, requiredPlan };
}

/**
 * Convenience: resolve user plan and check platform access in one call.
 */
export function userCanConnectPlatform(
  user: { subscription?: { plan?: string | null; status?: string | null } | null } | null,
  platform: string
): { allowed: boolean; userPlan: PlanTier; requiredPlan: PlanTier } {
  const userPlan = resolveUserPlan(user?.subscription);
  const { allowed, requiredPlan } = canConnectPlatform(userPlan, platform);
  return { allowed, userPlan, requiredPlan };
}

/**
 * Build a standard 403 error body for tier-gated endpoints.
 */
export function tierGateError(userPlan: PlanTier, requiredPlan: PlanTier, feature?: string) {
  return {
    error: 'Plan upgrade required',
    currentPlan: userPlan,
    requiredPlan,
    feature,
    upgradeUrl: '/pricing',
    message: `This feature requires the ${getPlanDisplayName(requiredPlan)} plan or higher. You are currently on the ${getPlanDisplayName(userPlan)} plan.`,
  };
}

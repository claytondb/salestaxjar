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
 *   - ALL platform integrations
 *   - Order import / sync (up to 500 orders/month)
 *   - Email deadline reminders
 *   - CSV order import
 * 
 * Pro adds:
 *   - Up to 5,000 orders/month
 *   - API key creation
 *   - Priority support
 * 
 * Business adds:
 *   - Unlimited orders
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
  | 'platform_connect'
  | 'order_import'
  | 'order_sync'
  | 'email_deadline_reminders'
  | 'csv_order_import'
  // Pro features
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

/** Monthly order limits per plan */
export const PLAN_ORDER_LIMITS: Record<PlanTier, number | null> = {
  free: 0,        // No order imports
  starter: 500,   // Up to 500 orders/month
  pro: 5000,      // Up to 5,000 orders/month
  business: null,  // Unlimited
};

/** Minimum plan tier required for each feature */
const FEATURE_MINIMUM_TIER: Record<Feature, PlanTier> = {
  // Free
  nexus_monitoring: 'free',
  tax_calculator: 'free',
  calculation_history: 'free',
  csv_export: 'free',

  // Starter — all platform integrations available
  platform_connect: 'starter',
  order_import: 'starter',
  order_sync: 'starter',
  email_deadline_reminders: 'starter',
  csv_order_import: 'starter',

  // Pro
  api_keys: 'pro',
  priority_support: 'pro',

  // Business
  auto_filing: 'business',
  highest_priority_support: 'business',
  early_access: 'business',
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
 * Check whether a plan tier can connect ANY platform.
 * All platforms are available on Starter+.
 */
export function canConnectPlatform(
  tier: PlanTier,
  _platform?: string
): { allowed: boolean; requiredPlan: PlanTier } {
  const allowed = getPlanLevel(tier) >= getPlanLevel('starter');
  return { allowed, requiredPlan: 'starter' };
}

/**
 * Get the monthly order limit for a plan tier.
 * Returns null for unlimited.
 */
export function getOrderLimit(tier: PlanTier): number | null {
  return PLAN_ORDER_LIMITS[tier];
}

/**
 * Check if a user has exceeded their monthly order limit.
 * Returns { allowed, currentCount, limit, remaining }
 */
export function checkOrderLimit(
  tier: PlanTier,
  currentMonthOrderCount: number
): { 
  allowed: boolean; 
  currentCount: number; 
  limit: number | null; 
  remaining: number | null;
  upgradeNeeded: PlanTier | null;
} {
  const limit = PLAN_ORDER_LIMITS[tier];
  
  // Unlimited
  if (limit === null) {
    return { allowed: true, currentCount: currentMonthOrderCount, limit: null, remaining: null, upgradeNeeded: null };
  }
  
  // Free users can't import
  if (limit === 0) {
    return { allowed: false, currentCount: currentMonthOrderCount, limit: 0, remaining: 0, upgradeNeeded: 'starter' };
  }
  
  const remaining = Math.max(0, limit - currentMonthOrderCount);
  const allowed = currentMonthOrderCount < limit;
  
  // Suggest next tier if at limit
  let upgradeNeeded: PlanTier | null = null;
  if (!allowed) {
    if (tier === 'starter') upgradeNeeded = 'pro';
    else if (tier === 'pro') upgradeNeeded = 'business';
  }
  
  return { allowed, currentCount: currentMonthOrderCount, limit, remaining, upgradeNeeded };
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
 * Human-readable order limit text.
 */
export function getOrderLimitDisplay(tier: PlanTier): string {
  const limit = PLAN_ORDER_LIMITS[tier];
  if (limit === null) return 'Unlimited orders';
  if (limit === 0) return 'No order imports';
  return `Up to ${limit.toLocaleString()} orders/month`;
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
 * All platforms available on Starter+.
 */
export function userCanConnectPlatform(
  user: { subscription?: { plan?: string | null; status?: string | null } | null } | null,
  _platform?: string
): { allowed: boolean; userPlan: PlanTier; requiredPlan: PlanTier } {
  const userPlan = resolveUserPlan(user?.subscription);
  const allowed = getPlanLevel(userPlan) >= getPlanLevel('starter');
  return { allowed, userPlan, requiredPlan: 'starter' };
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

/**
 * Build a 403 error body for order limit exceeded.
 */
export function orderLimitError(
  userPlan: PlanTier, 
  currentCount: number, 
  limit: number,
  upgradeNeeded: PlanTier | null
) {
  return {
    error: 'Monthly order limit reached',
    currentPlan: userPlan,
    currentCount,
    limit,
    upgradeUrl: '/pricing',
    upgradeTo: upgradeNeeded,
    message: `You've reached your monthly limit of ${limit.toLocaleString()} orders on the ${getPlanDisplayName(userPlan)} plan.${upgradeNeeded ? ` Upgrade to ${getPlanDisplayName(upgradeNeeded)} for ${getOrderLimitDisplay(upgradeNeeded).toLowerCase()}.` : ''}`,
  };
}

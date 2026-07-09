/**
 * Plan Features & Tier Gating
 *
 * Centralized plan-checking utility for Sails.tax
 *
 * Plan hierarchy:
 *   free → starter ($9) → pro ($29) → enterprise ($79)
 *
 * Platform-connection caps: free=1, starter=2, pro=3, enterprise=unlimited.
 *
 * Free users get:
 *   - Nexus monitoring (all states)
 *   - Tax calculator
 *   - Calculation history + CSV export
 *   - 1 platform connection
 *
 * Starter adds:
 *   - ALL platform integrations (up to 2 connections)
 *   - Order import / sync (up to 500 orders/month)
 *   - Email deadline reminders
 *   - CSV order import
 *
 * Pro adds:
 *   - Up to 5,000 orders/month
 *   - Up to 3 platform connections
 *   - API key creation
 *   - Priority support
 *
 * Enterprise adds:
 *   - Unlimited orders
 *   - Unlimited platform connections
 *   - Highest priority support
 *   - Early access to features
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise';

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
  // Enterprise features
  | 'auto_filing'
  | 'highest_priority_support'
  | 'early_access';

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

const PLAN_TIER_ORDER: PlanTier[] = ['free', 'starter', 'pro', 'enterprise'];

/** Monthly order limits per plan */
export const PLAN_ORDER_LIMITS: Record<PlanTier, number | null> = {
  free: 0,        // No order imports
  starter: 500,   // Up to 500 orders/month
  pro: 5000,      // Up to 5,000 orders/month
  enterprise: null,  // Unlimited
};

/**
 * Platform-connection caps per plan tier.
 * `null` means unlimited. These are enforced (by connection COUNT) at every
 * platform connect endpoint via checkPlatformLimit().
 */
export const PLAN_PLATFORM_LIMITS: Record<PlanTier, number | null> = {
  free: 1,        // 1 platform connection
  starter: 2,     // Up to 2 platform connections
  pro: 3,         // Up to 3 platform connections
  enterprise: null, // Unlimited
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

  // Enterprise
  auto_filing: 'enterprise',
  highest_priority_support: 'enterprise',
  early_access: 'enterprise',
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
 *   - Their subscription status is one that revokes access
 *     (canceled / unpaid / incomplete_expired / anything unrecognized)
 *
 * past_due GRACE PERIOD: a single failed payment (status 'past_due') does NOT
 * strip paid features. Stripe keeps the subscription active during its
 * smart-retry window, so we keep the paid plan until the subscription truly
 * ends. Only definitively-dead statuses fall back to free.
 */
export function resolveUserPlan(subscription: {
  plan?: string | null;
  status?: string | null;
} | null | undefined): PlanTier {
  if (!subscription) return 'free';

  const { plan, status } = subscription;

  // Entitled statuses keep the paid plan. 'past_due' is included as a grace
  // period; everything not listed here (canceled, unpaid, incomplete_expired,
  // etc.) drops to free.
  const ENTITLED_STATUSES = ['active', 'trialing', 'past_due'];
  if (!status || !ENTITLED_STATUSES.includes(status)) return 'free';

  // Backward-compat: a legacy stored plan of 'business' is the old name for the
  // top tier and must still resolve to 'enterprise'.
  if (plan === 'business') return 'enterprise';

  // Validate plan name
  if (plan === 'starter' || plan === 'pro' || plan === 'enterprise') {
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
 *
 * Every tier — including Free — can now connect at least one platform. The real
 * gate is a per-tier connection CAP (free=1, starter=2, pro=3, enterprise=∞),
 * enforced by connection COUNT via checkPlatformLimit() at the connect
 * endpoints (which know how many connections the user already has). This
 * function only answers "is this tier allowed to connect platforms at all",
 * which is always true.
 */
export function canConnectPlatform(
  tier: PlanTier,
  _platform?: string
): { allowed: boolean; requiredPlan: PlanTier } {
  return { allowed: true, requiredPlan: 'free' };
}

/**
 * Check whether a tier can add ANOTHER platform connection given how many it
 * already has. This is the real cap gate.
 *
 * Returns { allowed, limit, currentCount, upgradeNeeded }. `limit === null`
 * means unlimited. Only blocks NEW connections once at/over the cap — a user
 * already over a (newly lowered) cap keeps existing connections and simply
 * can't add more.
 */
export function checkPlatformLimit(
  tier: PlanTier,
  currentConnectionCount: number
): {
  allowed: boolean;
  limit: number | null;
  currentCount: number;
  upgradeNeeded: PlanTier | null;
} {
  const limit = PLAN_PLATFORM_LIMITS[tier];

  // Unlimited
  if (limit === null) {
    return { allowed: true, limit: null, currentCount: currentConnectionCount, upgradeNeeded: null };
  }

  const allowed = currentConnectionCount < limit;

  // Suggest the next tier up when blocked
  let upgradeNeeded: PlanTier | null = null;
  if (!allowed) {
    const idx = PLAN_TIER_ORDER.indexOf(tier);
    upgradeNeeded =
      idx >= 0 && idx < PLAN_TIER_ORDER.length - 1 ? PLAN_TIER_ORDER[idx + 1] : null;
  }

  return { allowed, limit, currentCount: currentConnectionCount, upgradeNeeded };
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
    else if (tier === 'pro') upgradeNeeded = 'enterprise';
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
    case 'enterprise': return 'Enterprise';
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
 * Convenience: resolve user plan and confirm the tier may connect platforms.
 *
 * Every tier (including Free) may connect platforms now; the per-tier CAP is
 * enforced separately by connection count via checkPlatformLimit() at the
 * connect endpoints. This returns the resolved plan for that follow-up check.
 */
export function userCanConnectPlatform(
  user: { subscription?: { plan?: string | null; status?: string | null } | null } | null,
  _platform?: string
): { allowed: boolean; userPlan: PlanTier; requiredPlan: PlanTier } {
  const userPlan = resolveUserPlan(user?.subscription);
  return { allowed: true, userPlan, requiredPlan: 'free' };
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

/**
 * Build a 403 error body for the platform-connection cap being reached.
 * Mirrors the tierGateError shape so clients can handle it the same way.
 */
export function platformLimitError(
  userPlan: PlanTier,
  limit: number | null,
  currentCount: number,
  upgradeNeeded: PlanTier | null
) {
  return {
    error: 'Platform connection limit reached',
    currentPlan: userPlan,
    limit,
    currentCount,
    upgradeUrl: '/pricing',
    upgradeTo: upgradeNeeded,
    message: `You've reached your plan's limit of ${limit} connected ${limit === 1 ? 'platform' : 'platforms'} on the ${getPlanDisplayName(userPlan)} plan.${upgradeNeeded ? ` Upgrade to ${getPlanDisplayName(upgradeNeeded)} to connect more.` : ''}`,
  };
}

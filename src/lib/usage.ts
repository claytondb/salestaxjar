/**
 * Usage Tracking & Limit Enforcement
 * 
 * Centralized module for tracking and enforcing plan usage limits.
 * Handles order counts, limit checks, and warning thresholds.
 */

import { prisma } from './prisma';
import { resolveUserPlan, checkOrderLimit, PLAN_ORDER_LIMITS, getPlanDisplayName, PlanTier } from './plans';

// Warning thresholds
const WARNING_THRESHOLD = 0.8; // 80%
const DANGER_THRESHOLD = 0.9;  // 90%

export interface UsageStatus {
  plan: PlanTier;
  planName: string;
  currentCount: number;
  limit: number | null;
  remaining: number | null;
  percentUsed: number;
  withinLimit: boolean;
  nearLimit: boolean;     // >= 80%
  atDanger: boolean;      // >= 90%
  atLimit: boolean;       // >= 100%
  upgradeNeeded: PlanTier | null;
  billingPeriod: {
    start: Date;
    end: Date;
  };
}

/**
 * Get the current billing period (calendar month)
 */
export function getCurrentBillingPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Get current month order count for a user
 */
export async function getCurrentMonthOrderCount(userId: string): Promise<number> {
  const { start } = getCurrentBillingPeriod();
  
  return prisma.importedOrder.count({
    where: {
      userId,
      createdAt: { gte: start },
    },
  });
}

/**
 * Get full usage status for a user
 */
export async function getUserUsageStatus(
  userId: string,
  subscription: { plan?: string | null; status?: string | null } | null | undefined
): Promise<UsageStatus> {
  const plan = resolveUserPlan(subscription);
  const { start, end } = getCurrentBillingPeriod();
  const currentCount = await getCurrentMonthOrderCount(userId);
  const limitCheck = checkOrderLimit(plan, currentCount);
  
  const limit = limitCheck.limit;
  const percentUsed = limit !== null && limit > 0
    ? Math.round((currentCount / limit) * 100)
    : 0;
  
  return {
    plan,
    planName: getPlanDisplayName(plan),
    currentCount,
    limit: limitCheck.limit,
    remaining: limitCheck.remaining,
    percentUsed,
    withinLimit: limitCheck.allowed,
    nearLimit: limit !== null && limit > 0 && (currentCount / limit) >= WARNING_THRESHOLD,
    atDanger: limit !== null && limit > 0 && (currentCount / limit) >= DANGER_THRESHOLD,
    atLimit: !limitCheck.allowed,
    upgradeNeeded: limitCheck.upgradeNeeded,
    billingPeriod: { start, end },
  };
}

/**
 * Check if a user can import more orders
 * 
 * @param userId - User ID
 * @param subscription - User's subscription object
 * @param orderCount - Number of orders to import (optional, defaults to 1)
 * @returns Object with allowed status and error info
 */
export async function canImportOrders(
  userId: string,
  subscription: { plan?: string | null; status?: string | null } | null | undefined,
  orderCount: number = 1
): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number | null;
  remaining: number | null;
  wouldExceed: boolean;
  error?: string;
}> {
  const plan = resolveUserPlan(subscription);
  const limit = PLAN_ORDER_LIMITS[plan];
  
  // Unlimited
  if (limit === null) {
    return { allowed: true, currentCount: 0, limit: null, remaining: null, wouldExceed: false };
  }
  
  // Free users can't import at all
  if (limit === 0) {
    return {
      allowed: false,
      currentCount: 0,
      limit: 0,
      remaining: 0,
      wouldExceed: true,
      error: `Order imports require the Starter plan or higher. You are currently on the Free plan.`,
    };
  }
  
  // Check current usage
  const currentCount = await getCurrentMonthOrderCount(userId);
  const remaining = Math.max(0, limit - currentCount);
  const wouldExceed = (currentCount + orderCount) > limit;
  
  if (currentCount >= limit) {
    return {
      allowed: false,
      currentCount,
      limit,
      remaining: 0,
      wouldExceed: true,
      error: `You've reached your monthly limit of ${limit.toLocaleString()} orders on the ${getPlanDisplayName(plan)} plan.`,
    };
  }
  
  if (wouldExceed) {
    return {
      allowed: true, // Allow partial import
      currentCount,
      limit,
      remaining,
      wouldExceed: true,
      error: `You can only import ${remaining.toLocaleString()} more orders this month. ${orderCount.toLocaleString()} orders requested would exceed your limit.`,
    };
  }
  
  return {
    allowed: true,
    currentCount,
    limit,
    remaining,
    wouldExceed: false,
  };
}

/**
 * Calculate how many orders can be imported without exceeding the limit
 * Useful for truncating large sync operations
 */
export async function getImportableOrderCount(
  userId: string,
  subscription: { plan?: string | null; status?: string | null } | null | undefined,
  requestedCount: number
): Promise<{
  canImport: number;
  remaining: number | null;
  truncated: boolean;
  limit: number | null;
}> {
  const plan = resolveUserPlan(subscription);
  const limit = PLAN_ORDER_LIMITS[plan];
  
  // Unlimited
  if (limit === null) {
    return { canImport: requestedCount, remaining: null, truncated: false, limit: null };
  }
  
  // Free
  if (limit === 0) {
    return { canImport: 0, remaining: 0, truncated: requestedCount > 0, limit: 0 };
  }
  
  const currentCount = await getCurrentMonthOrderCount(userId);
  const remaining = Math.max(0, limit - currentCount);
  const canImport = Math.min(requestedCount, remaining);
  const truncated = canImport < requestedCount;
  
  return { canImport, remaining, truncated, limit };
}

/**
 * Error response for order limit exceeded
 */
export function orderLimitExceededError(
  plan: PlanTier,
  currentCount: number,
  limit: number,
  requested: number
) {
  const nextPlan = plan === 'starter' ? 'Pro' : plan === 'pro' ? 'Business' : null;
  
  return {
    error: 'Order limit exceeded',
    code: 'ORDER_LIMIT_EXCEEDED',
    currentPlan: getPlanDisplayName(plan),
    currentCount,
    limit,
    requested,
    remaining: Math.max(0, limit - currentCount),
    message: `You've reached your monthly limit of ${limit.toLocaleString()} orders.${
      nextPlan ? ` Upgrade to ${nextPlan} for more capacity.` : ''
    }`,
    upgradeUrl: '/pricing',
  };
}

/**
 * Error response for free tier attempting to import
 */
export function freeUserImportError() {
  return {
    error: 'Plan upgrade required',
    code: 'FREE_TIER_IMPORT',
    message: 'Order imports require the Starter plan ($9/mo) or higher. The Free plan includes unlimited tax calculations and nexus monitoring.',
    upgradeUrl: '/pricing',
  };
}

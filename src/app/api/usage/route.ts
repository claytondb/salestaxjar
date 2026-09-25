import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentMonthOrderCount, getCurrentBillingPeriod } from '@/lib/usage';
import { resolveUserPlan, checkOrderLimit, getOrderLimitDisplay, getPlanDisplayName } from '@/lib/plans';

/**
 * GET /api/usage
 * 
 * Returns the user's current plan usage (order count vs limit)
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPlan = resolveUserPlan(user.subscription);
    
    // Orders DATED this month (plan limits are orders per month by order date;
    // importing older history doesn't count toward this month — see usage.ts)
    const currentMonthOrderCount = await getCurrentMonthOrderCount(user.id);
    const { start: monthStart, end: monthEnd } = getCurrentBillingPeriod();

    const limitCheck = checkOrderLimit(userPlan, currentMonthOrderCount);
    const percentUsed = limitCheck.limit !== null && limitCheck.limit > 0
      ? Math.round((currentMonthOrderCount / limitCheck.limit) * 100)
      : 0;

    return NextResponse.json({
      plan: userPlan,
      planName: getPlanDisplayName(userPlan),
      orders: {
        current: currentMonthOrderCount,
        limit: limitCheck.limit,
        limitDisplay: getOrderLimitDisplay(userPlan),
        remaining: limitCheck.remaining,
        percentUsed,
        atLimit: !limitCheck.allowed,
        upgradeNeeded: limitCheck.upgradeNeeded,
      },
      billingPeriod: {
        start: monthStart.toISOString(),
        end: monthEnd.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}

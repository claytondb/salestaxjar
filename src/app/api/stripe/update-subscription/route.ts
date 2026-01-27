import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { 
  updateSubscription, 
  previewSubscriptionChange, 
  PLANS, 
  isStripeConfigured,
  isUpgrade,
  PlanId
} from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { checkApiRateLimit, rateLimitHeaders } from '@/lib/ratelimit';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Rate limit
    const rateLimit = await checkApiRateLimit(user.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Payment system not configured', demo: true },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { newPlanId, action } = body;

    // Validate plan
    if (!newPlanId || !(newPlanId in PLANS)) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Get user's current subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (!subscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found. Please subscribe first.' },
        { status: 400 }
      );
    }

    const newPlan = PLANS[newPlanId as PlanId];
    const currentPlanId = subscription.plan as PlanId;
    const upgrading = isUpgrade(currentPlanId, newPlanId);

    // If just previewing the change
    if (action === 'preview') {
      const preview = await previewSubscriptionChange({
        subscriptionId: subscription.stripeSubscriptionId,
        newPriceId: newPlan.priceId,
      });

      if (preview.error) {
        return NextResponse.json(
          { error: preview.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        isUpgrade: upgrading,
        currentPlan: currentPlanId,
        newPlan: newPlanId,
        prorationAmount: preview.prorationAmount,
        immediateCharge: preview.immediateCharge,
        nextBillingAmount: preview.nextBillingAmount,
      });
    }

    // Apply the subscription change
    const result = await updateSubscription({
      subscriptionId: subscription.stripeSubscriptionId,
      newPriceId: newPlan.priceId,
      isUpgrade: upgrading,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Update local subscription record
    await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        plan: newPlanId,
        // If downgrade, set scheduledPlanChange to indicate pending change
        scheduledPlanChange: upgrading ? null : newPlanId,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      isUpgrade: upgrading,
      newPlan: newPlanId,
      message: upgrading 
        ? `Upgraded to ${newPlan.name}! Your card has been charged the prorated amount.`
        : `Downgrade to ${newPlan.name} scheduled. Your current plan will remain active until the end of your billing period.`,
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

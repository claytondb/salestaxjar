import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { cancelSubscription, isStripeConfigured } from '@/lib/stripe';
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
    const { cancelImmediately = false } = body;

    // Get user's current subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (!subscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Cancel the subscription
    const result = await cancelSubscription(
      subscription.stripeSubscriptionId,
      cancelImmediately
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to cancel subscription' },
        { status: 500 }
      );
    }

    // Update local subscription record
    if (cancelImmediately) {
      // Immediate cancellation - set to free plan now
      await prisma.subscription.update({
        where: { userId: user.id },
        data: {
          plan: 'free',
          stripeSubscriptionId: null,
          updatedAt: new Date(),
        },
      });
    } else {
      // Scheduled cancellation - mark as canceling (webhook will handle final update)
      await prisma.subscription.update({
        where: { userId: user.id },
        data: {
          cancelAtPeriodEnd: true,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      cancelledImmediately: cancelImmediately,
      message: cancelImmediately 
        ? 'Your subscription has been cancelled. You are now on the Free plan.'
        : 'Your subscription will be cancelled at the end of your billing period. You\'ll keep access to your current plan until then.',
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

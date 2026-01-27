import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createPortalSession, isStripeConfigured } from '@/lib/stripe';
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

    // Get subscription with customer ID
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 400 }
      );
    }

    // Get the host for redirect URL
    const host = request.headers.get('host');
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const returnUrl = `${protocol}://${host}/settings?tab=billing`;

    // Create portal session
    const result = await createPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: result.url,
    });
  } catch (error) {
    console.error('Create portal session error:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}

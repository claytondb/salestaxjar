import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createCheckoutSession, getOrCreateCustomer, PLANS, isStripeConfigured } from '@/lib/stripe';
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
    const { planId } = body;

    // Validate plan
    if (!planId || !(planId in PLANS)) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    const plan = PLANS[planId as keyof typeof PLANS];

    // Get or create Stripe customer
    let customerId: string | undefined;
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (subscription?.stripeCustomerId) {
      customerId = subscription.stripeCustomerId;
    } else {
      const customerResult = await getOrCreateCustomer({
        email: user.email,
        name: user.name,
        userId: user.id,
      });

      if (customerResult.error) {
        return NextResponse.json(
          { error: customerResult.error },
          { status: 500 }
        );
      }

      customerId = customerResult.customerId;

      // Save customer ID
      await prisma.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          stripeCustomerId: customerId!,
        },
        update: {
          stripeCustomerId: customerId!,
        },
      });
    }

    // Get the host for redirect URLs
    const host = request.headers.get('host');
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    // Debug logging
    console.log('Creating checkout session with:', {
      planId,
      priceId: plan.priceId,
      customerId,
      host,
      baseUrl,
    });

    // Create checkout session
    const result = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      priceId: plan.priceId,
      customerId,
      successUrl: `${baseUrl}/settings?tab=billing&success=true`,
      cancelUrl: `${baseUrl}/settings?tab=billing&canceled=true`,
    });

    if (result.error) {
      console.error('Checkout session error:', result.error);
      return NextResponse.json(
        { error: result.error, debug: { planId, priceId: plan.priceId, customerId } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionId: result.sessionId,
      url: result.url,
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

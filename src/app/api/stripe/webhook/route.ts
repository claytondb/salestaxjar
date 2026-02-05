import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent, getPlanByPriceId, isStripeConfigured } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { sendPaymentFailedEmail } from '@/lib/email';
import Stripe from 'stripe';

/**
 * Stripe Webhook Handler
 * 
 * IMPORTANT: If you're seeing 401 errors on this endpoint, it's likely
 * caused by Vercel Deployment Protection. To fix:
 * 
 * 1. Go to Vercel Dashboard → Project Settings → Deployment Protection
 * 2. Either disable protection for Production, OR
 * 3. Under "Protection Bypass for Automation", enable it and set the
 *    VERCEL_AUTOMATION_BYPASS_SECRET env var. Then configure Stripe
 *    to send the header: x-vercel-protection-bypass: <secret>
 *    (Stripe supports custom headers in webhook endpoint settings)
 * 
 * Next.js App Router handles raw body automatically for webhooks.
 */

// Ensure this route is not statically optimized and runs on edge/serverless
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    console.error('Stripe webhook received but Stripe is not configured');
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Stripe webhook: missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    const event = constructWebhookEvent(body, signature);
    if (!event) {
      console.error('Stripe webhook: signature verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log(`Stripe webhook received: ${event.type} (${event.id})`);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    // Return 200 to prevent Stripe from retrying on application errors
    // (Stripe retries on 5xx, which can cause duplicate processing)
    // Only return 500 for truly unexpected errors where we want a retry
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id || session.metadata?.userId;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    console.error('checkout.session.completed: No user ID found in session', {
      sessionId: session.id,
      clientReferenceId: session.client_reference_id,
      metadata: session.metadata,
    });
    return;
  }

  if (!customerId) {
    console.error('checkout.session.completed: No customer ID', { sessionId: session.id, userId });
    return;
  }

  // Fetch the full subscription to get price/plan details
  let plan = 'starter';
  let priceId: string | undefined;
  let currentPeriodEnd: Date | null = null;
  let currentPeriodStart: Date | null = null;
  
  if (subscriptionId) {
    try {
      const { stripe } = await import('@/lib/stripe');
      if (stripe) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
        priceId = subscription.items?.data?.[0]?.price?.id;
        
        if (priceId) {
          const planInfo = getPlanByPriceId(priceId);
          if (planInfo) {
            plan = planInfo.id;
          } else {
            console.warn(`checkout.session.completed: Unknown price ID ${priceId}, defaulting to starter`);
          }
        }
        
        // Get period dates for billing display
        if (subscription.current_period_start) {
          currentPeriodStart = new Date(subscription.current_period_start * 1000);
        }
        if (subscription.current_period_end) {
          currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        }
      }
    } catch (error) {
      console.error('checkout.session.completed: Failed to fetch subscription details:', error);
      // Continue with defaults — we still want to activate the subscription
    }
  } else {
    console.warn('checkout.session.completed: No subscription ID (one-time payment?)', {
      sessionId: session.id,
      userId,
    });
  }

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      plan,
      status: 'active',
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
    },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      plan,
      status: 'active',
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
    },
  });
  
  console.log(`checkout.session.completed: user=${userId}, plan=${plan}, priceId=${priceId}, periodEnd=${currentPeriodEnd?.toISOString()}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  // Find user by customer ID
  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!dbSubscription) {
    console.error('No subscription found for customer:', customerId);
    return;
  }

  // Get plan from price ID
  const priceId = subscription.items.data[0]?.price?.id;
  const planInfo = priceId ? getPlanByPriceId(priceId) : null;

  // Extract period timestamps - handle both number and null cases
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subData = subscription as any;
  const periodStart = subData.current_period_start 
    ? new Date(subData.current_period_start * 1000) 
    : null;
  const periodEnd = subData.current_period_end 
    ? new Date(subData.current_period_end * 1000) 
    : null;

  await prisma.subscription.update({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: subscription.status,
      plan: planInfo?.id || 'starter',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    },
  });
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  await prisma.subscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      status: 'canceled',
      stripeSubscriptionId: null,
      stripePriceId: null,
    },
  });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  
  // Update subscription status to active
  await prisma.subscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      status: 'active',
    },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  
  // Update subscription status to past_due
  await prisma.subscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      status: 'past_due',
    },
  });

  // Send email notification about failed payment
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { stripeCustomerId: customerId },
      include: { user: true },
    });

    if (subscription?.user) {
      await sendPaymentFailedEmail({
        to: subscription.user.email,
        name: subscription.user.name,
        userId: subscription.user.id,
      });
      console.log('Payment failed email sent to:', subscription.user.email);
    }
  } catch (error) {
    console.error('Failed to send payment failed email:', error);
  }
}

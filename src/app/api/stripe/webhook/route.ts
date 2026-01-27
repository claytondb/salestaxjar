import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent, getPlanByPriceId, isStripeConfigured } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// Note: Next.js App Router handles raw body automatically for webhooks

export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    const event = constructWebhookEvent(body, signature);
    if (!event) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

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
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
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
    console.error('No user ID in checkout session');
    return;
  }

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status: 'active',
    },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status: 'active',
    },
  });
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

  // TODO: Send email notification about failed payment
}

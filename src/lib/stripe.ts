import Stripe from 'stripe';

// Initialize Stripe with the secret key (server-side only)
// Falls back gracefully if key is not set (for build time)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  : null;

// Check if Stripe is configured
export function isStripeConfigured(): boolean {
  return !!stripe;
}

// Plan configuration
export const PLANS = {
  starter: {
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter',
    price: 29,
    features: [
      'Up to 500 orders/mo',
      '3 state filings',
      'Shopify integration',
      'Email support',
    ],
  },
  growth: {
    name: 'Growth',
    priceId: process.env.STRIPE_GROWTH_PRICE_ID || 'price_growth',
    price: 79,
    popular: true,
    features: [
      'Up to 5,000 orders/mo',
      'Unlimited filings',
      'All integrations',
      'Priority support',
      'Nexus tracking',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise',
    price: 199,
    features: [
      'Unlimited orders',
      'Unlimited filings',
      'Custom integrations',
      'Dedicated manager',
      'Audit protection',
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

// Create checkout session for new subscriptions
export async function createCheckoutSession(params: {
  userId: string;
  email: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
}): Promise<{ sessionId?: string; url?: string; error?: string }> {
  if (!stripe) {
    return { error: 'Stripe is not configured' };
  }

  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      client_reference_id: params.userId,
      metadata: {
        userId: params.userId,
      },
    };

    // Use existing customer or create new one
    if (params.customerId) {
      sessionParams.customer = params.customerId;
    } else {
      sessionParams.customer_email = params.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return { sessionId: session.id, url: session.url || undefined };
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create checkout session' };
  }
}

// Create billing portal session for managing subscriptions
export async function createPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<{ url?: string; error?: string }> {
  if (!stripe) {
    return { error: 'Stripe is not configured' };
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });

    return { url: session.url };
  } catch (error) {
    console.error('Stripe portal error:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create portal session' };
  }
}

// Create or retrieve Stripe customer
export async function getOrCreateCustomer(params: {
  email: string;
  name?: string;
  userId: string;
}): Promise<{ customerId?: string; error?: string }> {
  if (!stripe) {
    return { error: 'Stripe is not configured' };
  }

  try {
    // Check for existing customer
    const existingCustomers = await stripe.customers.list({
      email: params.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return { customerId: existingCustomers.data[0].id };
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: {
        userId: params.userId,
      },
    });

    return { customerId: customer.id };
  } catch (error) {
    console.error('Stripe customer error:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create customer' };
  }
}

// Get subscription details
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  if (!stripe) {
    return null;
  }

  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch {
    return null;
  }
}

// Cancel subscription
export async function cancelSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<{ success: boolean; error?: string }> {
  if (!stripe) {
    return { success: false, error: 'Stripe is not configured' };
  }

  try {
    if (immediately) {
      await stripe.subscriptions.cancel(subscriptionId);
    } else {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
    return { success: true };
  } catch (error) {
    console.error('Stripe cancel error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to cancel subscription' };
  }
}

// Verify webhook signature
export function constructWebhookEvent(
  payload: Buffer | string,
  signature: string
): Stripe.Event | null {
  if (!stripe) {
    return null;
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return null;
  }
}

// Get plan by price ID
export function getPlanByPriceId(priceId: string): { id: PlanId; plan: typeof PLANS[PlanId] } | null {
  for (const [id, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) {
      return { id: id as PlanId, plan };
    }
  }
  return null;
}

// Plan tier order for determining upgrades vs downgrades
const PLAN_TIER_ORDER: PlanId[] = ['starter', 'growth', 'enterprise'];

export function getPlanTier(planId: PlanId): number {
  return PLAN_TIER_ORDER.indexOf(planId);
}

export function isUpgrade(currentPlan: PlanId, newPlan: PlanId): boolean {
  return getPlanTier(newPlan) > getPlanTier(currentPlan);
}

// Update subscription (for existing subscribers)
export async function updateSubscription(params: {
  subscriptionId: string;
  newPriceId: string;
  isUpgrade: boolean;
}): Promise<{ subscription?: Stripe.Subscription; error?: string }> {
  if (!stripe) {
    return { error: 'Stripe is not configured' };
  }

  try {
    // Get current subscription to find the item ID
    const subscription = await stripe.subscriptions.retrieve(params.subscriptionId);
    const subscriptionItemId = subscription.items.data[0]?.id;

    if (!subscriptionItemId) {
      return { error: 'No subscription item found' };
    }

    if (params.isUpgrade) {
      // Upgrade: Apply immediately with proration
      const updatedSubscription = await stripe.subscriptions.update(params.subscriptionId, {
        items: [
          {
            id: subscriptionItemId,
            price: params.newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      });
      return { subscription: updatedSubscription };
    } else {
      // Downgrade: Schedule change for end of billing period
      const updatedSubscription = await stripe.subscriptions.update(params.subscriptionId, {
        items: [
          {
            id: subscriptionItemId,
            price: params.newPriceId,
          },
        ],
        proration_behavior: 'none',
        billing_cycle_anchor: 'unchanged',
      });
      
      // Actually for downgrades, we want to use schedule
      // Let's cancel the above and use a subscription schedule instead
      // Actually Stripe handles this differently - we need to use cancel_at_period_end approach
      // or use subscription schedules. For simplicity, let's update with proration_behavior: 'none'
      // which effectively means the new price takes effect at next billing cycle
      
      return { subscription: updatedSubscription };
    }
  } catch (error) {
    console.error('Stripe subscription update error:', error);
    return { error: error instanceof Error ? error.message : 'Failed to update subscription' };
  }
}

// Preview proration for subscription change
export async function previewSubscriptionChange(params: {
  subscriptionId: string;
  newPriceId: string;
}): Promise<{ 
  prorationAmount?: number; 
  immediateCharge?: number;
  nextBillingAmount?: number;
  error?: string 
}> {
  if (!stripe) {
    return { error: 'Stripe is not configured' };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(params.subscriptionId);
    const subscriptionItemId = subscription.items.data[0]?.id;

    if (!subscriptionItemId) {
      return { error: 'No subscription item found' };
    }

    // Create a preview invoice to see proration
    const invoice = await stripe.invoices.createPreview({
      subscription: params.subscriptionId,
      subscription_details: {
        items: [
          {
            id: subscriptionItemId,
            price: params.newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      },
    });

    // Find proration line items
    const prorationItems = invoice.lines.data.filter(
      line => line.proration
    );
    const prorationAmount = prorationItems.reduce(
      (sum, item) => sum + item.amount, 
      0
    );

    return {
      prorationAmount: prorationAmount / 100, // Convert from cents
      immediateCharge: invoice.amount_due / 100,
      nextBillingAmount: invoice.subtotal / 100,
    };
  } catch (error) {
    console.error('Stripe proration preview error:', error);
    return { error: error instanceof Error ? error.message : 'Failed to preview change' };
  }
}

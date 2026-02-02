import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function GET() {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' });
  }
  
  const priceId = process.env.STRIPE_STARTER_PRICE_ID || 'not-set';
  
  try {
    // Try to fetch the price using the initialized Stripe client
    const price = await stripe.prices.retrieve(priceId);
    return NextResponse.json({
      success: true,
      priceId: price.id,
      amount: price.unit_amount,
      currency: price.currency,
      livemode: price.livemode,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      attemptedPriceId: priceId,
      stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 15),
    });
  }
}

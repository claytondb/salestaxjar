import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

// Debug route - development only
export async function GET() {
  // Block access in production
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoints are disabled in production' },
      { status: 403 }
    );
  }
  
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
      // Don''t expose key prefix in any environment
    });
  }
}

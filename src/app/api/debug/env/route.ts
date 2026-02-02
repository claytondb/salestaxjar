import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    STRIPE_STARTER_PRICE_ID: process.env.STRIPE_STARTER_PRICE_ID || '(not set)',
    STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID || '(not set)',
    STRIPE_BUSINESS_PRICE_ID: process.env.STRIPE_BUSINESS_PRICE_ID || '(not set)',
    STRIPE_SECRET_KEY_PREFIX: process.env.STRIPE_SECRET_KEY?.substring(0, 12) || '(not set)',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });
}

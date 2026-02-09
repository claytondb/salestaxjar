import { NextResponse } from 'next/server';

// Debug routes should only be accessible in development
export async function GET() {
  // Block access in production
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoints are disabled in production' },
      { status: 403 }
    );
  }
  
  // Only show safe information
  return NextResponse.json({
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV || '(not set)',
      HAS_STRIPE_KEY: !!process.env.STRIPE_SECRET_KEY,
      HAS_DATABASE: !!process.env.DATABASE_URL,
    },
    message: 'Debug endpoint - development only',
  });
}

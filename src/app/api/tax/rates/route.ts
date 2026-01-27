import { NextRequest, NextResponse } from 'next/server';
import { getTaxRate, getAllStateRates, isTaxJarConfigured } from '@/lib/taxjar';
import { checkApiRateLimit, rateLimitHeaders } from '@/lib/ratelimit';

// GET /api/tax/rates - Get all state rates or specific rate by state/zip
export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'anonymous';

    // Rate limit
    const rateLimit = await checkApiRateLimit(ip);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const { searchParams } = new URL(request.url);
    const stateCode = searchParams.get('state');
    const zipCode = searchParams.get('zip');
    const city = searchParams.get('city');

    // If state code is provided, get specific rate
    if (stateCode) {
      const rate = await getTaxRate({
        stateCode: stateCode.toUpperCase(),
        zip: zipCode || undefined,
        city: city || undefined,
      });

      return NextResponse.json({
        rate,
        taxJarConfigured: isTaxJarConfigured(),
      });
    }

    // Otherwise return all state rates
    const rates = getAllStateRates();

    return NextResponse.json({
      rates,
      count: rates.length,
      taxJarConfigured: isTaxJarConfigured(),
    });
  } catch (error) {
    console.error('Tax rates error:', error);
    return NextResponse.json(
      { error: 'Failed to get tax rates' },
      { status: 500 }
    );
  }
}

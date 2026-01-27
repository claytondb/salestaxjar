import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { calculateTax, isTaxJarConfigured } from '@/lib/taxjar';
import { prisma } from '@/lib/prisma';
import { checkTaxCalcRateLimit, rateLimitHeaders } from '@/lib/ratelimit';
import type { ProductCategory } from '@/types';
import { getStateByCode } from '@/data/taxRates';

export async function POST(request: NextRequest) {
  try {
    // Get user (optional - allow unauthenticated basic calculations)
    const user = await getCurrentUser();
    const identifier = user?.id || request.headers.get('x-forwarded-for') || 'anonymous';

    // Rate limit
    const rateLimit = await checkTaxCalcRateLimit(identifier);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const { amount, stateCode, category, zipCode, city, shipping } = body;

    // Validate required fields
    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    if (!stateCode || typeof stateCode !== 'string') {
      return NextResponse.json(
        { error: 'State code is required' },
        { status: 400 }
      );
    }

    // Validate state code
    const state = getStateByCode(stateCode);
    if (!state) {
      return NextResponse.json(
        { error: 'Invalid state code' },
        { status: 400 }
      );
    }

    // Calculate tax
    const result = await calculateTax({
      amount,
      shipping: shipping || 0,
      toAddress: {
        state: stateCode.toUpperCase(),
        zip: zipCode,
        city,
      },
      category: (category as ProductCategory) || 'general',
    });

    // Save calculation if user is authenticated
    if (user) {
      try {
        await prisma.calculation.create({
          data: {
            userId: user.id,
            amount,
            stateCode: stateCode.toUpperCase(),
            stateName: state.state,
            category: category || 'general',
            taxRate: result.rate,
            taxAmount: result.taxAmount,
            total: result.total,
            source: result.source,
          },
        });
      } catch (e) {
        // Don't fail the request if saving fails
        console.error('Failed to save calculation:', e);
      }
    }

    return NextResponse.json({
      amount,
      stateCode: stateCode.toUpperCase(),
      stateName: state.state,
      category: category || 'general',
      taxRate: result.rate,
      taxAmount: result.taxAmount,
      total: result.total,
      breakdown: result.breakdown,
      source: result.source,
      taxJarConfigured: isTaxJarConfigured(),
    });
  } catch (error) {
    console.error('Tax calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate tax' },
      { status: 500 }
    );
  }
}

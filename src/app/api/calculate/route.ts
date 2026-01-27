import { NextRequest, NextResponse } from 'next/server';
import { calculateTax, getStateByCode } from '@/data/taxRates';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const amount = parseFloat(searchParams.get('amount') || '0');
  const stateCode = searchParams.get('state') || '';

  if (!amount || amount <= 0) {
    return NextResponse.json(
      { error: 'Invalid amount. Please provide a positive number.' },
      { status: 400 }
    );
  }

  if (!stateCode) {
    return NextResponse.json(
      { error: 'State code is required.' },
      { status: 400 }
    );
  }

  const result = calculateTax(amount, stateCode);
  
  if (!result) {
    return NextResponse.json(
      { error: 'Invalid state code.' },
      { status: 400 }
    );
  }

  const stateInfo = getStateByCode(stateCode);

  return NextResponse.json({
    success: true,
    data: {
      amount,
      state: stateInfo?.state,
      stateCode: stateInfo?.stateCode,
      stateRate: stateInfo?.stateRate,
      avgLocalRate: stateInfo?.avgLocalRate,
      combinedRate: result.rate,
      taxAmount: result.tax,
      total: result.total,
      hasLocalTax: stateInfo?.hasLocalTax,
      notes: stateInfo?.notes
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, stateCode } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Please provide a positive number.' },
        { status: 400 }
      );
    }

    if (!stateCode) {
      return NextResponse.json(
        { error: 'State code is required.' },
        { status: 400 }
      );
    }

    const result = calculateTax(amount, stateCode);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Invalid state code.' },
        { status: 400 }
      );
    }

    const stateInfo = getStateByCode(stateCode);

    return NextResponse.json({
      success: true,
      data: {
        amount,
        state: stateInfo?.state,
        stateCode: stateInfo?.stateCode,
        stateRate: stateInfo?.stateRate,
        avgLocalRate: stateInfo?.avgLocalRate,
        combinedRate: result.rate,
        taxAmount: result.tax,
        total: result.total,
        hasLocalTax: stateInfo?.hasLocalTax,
        notes: stateInfo?.notes
      }
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { stateTaxRates, getStateByCode, getNoTaxStates, getHighestTaxStates } from '@/data/taxRates';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const stateCode = searchParams.get('state');
  const filter = searchParams.get('filter'); // 'no-tax', 'highest'

  // Single state lookup
  if (stateCode) {
    const state = getStateByCode(stateCode);
    if (!state) {
      return NextResponse.json(
        { error: 'State not found.' },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: state
    });
  }

  // Filter: no-tax states
  if (filter === 'no-tax') {
    return NextResponse.json({
      success: true,
      data: getNoTaxStates()
    });
  }

  // Filter: highest tax states
  if (filter === 'highest') {
    const limit = parseInt(searchParams.get('limit') || '5');
    return NextResponse.json({
      success: true,
      data: getHighestTaxStates(limit)
    });
  }

  // Return all states
  return NextResponse.json({
    success: true,
    count: stateTaxRates.length,
    data: stateTaxRates
  });
}

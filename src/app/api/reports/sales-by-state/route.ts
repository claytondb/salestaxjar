/**
 * Sales by State Report API
 * 
 * Returns aggregated sales data grouped by state for a date range.
 * Supports rolling 12 months, calendar year, or custom date ranges.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// State name lookup
const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia', PR: 'Puerto Rico',
};

export async function GET(req: Request) {
  try {
    // Verify authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const { searchParams } = new URL(req.url);
    
    // Parse date range parameters
    const rangeType = searchParams.get('range') || 'rolling12'; // rolling12, calendarYear, custom
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let startDate: Date;
    let endDate: Date = new Date();

    if (rangeType === 'rolling12') {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);
    } else if (rangeType === 'calendarYear') {
      startDate = new Date(new Date().getFullYear(), 0, 1);
    } else if (rangeType === 'custom' && startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      // Default to rolling 12 months
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);
    }

    // Query aggregated sales by state
    const salesByState = await prisma.importedOrder.groupBy({
      by: ['shippingState'],
      where: {
        userId,
        shippingCountry: 'US',
        shippingState: { not: null },
        orderDate: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          notIn: ['cancelled', 'refunded'],
        },
      },
      _sum: {
        subtotal: true,
        taxAmount: true,
        totalAmount: true,
        shippingAmount: true,
      },
      _count: true,
    });

    // Get platform breakdown per state
    const platformBreakdown = await prisma.importedOrder.groupBy({
      by: ['shippingState', 'platform'],
      where: {
        userId,
        shippingCountry: 'US',
        shippingState: { not: null },
        orderDate: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          notIn: ['cancelled', 'refunded'],
        },
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    // Build platform lookup by state
    const platformsByState: Record<string, Array<{ platform: string; orders: number; sales: number }>> = {};
    for (const row of platformBreakdown) {
      if (!row.shippingState) continue;
      if (!platformsByState[row.shippingState]) {
        platformsByState[row.shippingState] = [];
      }
      platformsByState[row.shippingState].push({
        platform: row.platform,
        orders: row._count,
        sales: Number(row._sum.totalAmount || 0),
      });
    }

    // Get user's nexus states
    const business = await prisma.business.findFirst({
      where: { userId },
      include: { nexusStates: true },
    });

    const nexusStateCodes = new Set(
      business?.nexusStates.filter(n => n.hasNexus).map(n => n.stateCode) || []
    );

    // Format response
    const stateReports = salesByState
      .filter(row => row.shippingState)
      .map(row => ({
        stateCode: row.shippingState!,
        stateName: STATE_NAMES[row.shippingState!] || row.shippingState!,
        hasNexus: nexusStateCodes.has(row.shippingState!),
        orderCount: row._count,
        subtotal: Number(row._sum.subtotal || 0),
        shipping: Number(row._sum.shippingAmount || 0),
        taxCollected: Number(row._sum.taxAmount || 0),
        totalSales: Number(row._sum.totalAmount || 0),
        platforms: platformsByState[row.shippingState!] || [],
      }))
      .sort((a, b) => b.totalSales - a.totalSales);

    // Calculate totals
    const totals = stateReports.reduce(
      (acc, state) => ({
        orderCount: acc.orderCount + state.orderCount,
        subtotal: acc.subtotal + state.subtotal,
        shipping: acc.shipping + state.shipping,
        taxCollected: acc.taxCollected + state.taxCollected,
        totalSales: acc.totalSales + state.totalSales,
      }),
      { orderCount: 0, subtotal: 0, shipping: 0, taxCollected: 0, totalSales: 0 }
    );

    return NextResponse.json({
      range: {
        type: rangeType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      states: stateReports,
      totals,
      statesWithNexus: nexusStateCodes.size,
      statesWithSales: stateReports.length,
    });
  } catch (error) {
    console.error('Sales by state report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

/**
 * Report Export API
 * 
 * Exports sales data as CSV for download.
 * Supports sales-by-state and detailed order exports.
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

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export async function GET(req: Request) {
  try {
    // Verify authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const { searchParams } = new URL(req.url);
    
    // Parse parameters
    const exportType = searchParams.get('type') || 'summary'; // summary, detailed
    const rangeType = searchParams.get('range') || 'rolling12';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const stateFilter = searchParams.get('state'); // Optional: filter to single state

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
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);
    }

    // Build where clause
    const whereClause: Record<string, unknown> = {
      userId,
      shippingCountry: 'US',
      orderDate: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        notIn: ['cancelled', 'refunded'],
      },
    };

    if (stateFilter) {
      whereClause.shippingState = stateFilter;
    }

    let csv = '';
    let filename = '';

    if (exportType === 'summary') {
      // Sales by state summary
      const salesByState = await prisma.importedOrder.groupBy({
        by: ['shippingState'],
        where: {
          ...whereClause,
          shippingState: stateFilter || { not: null },
        },
        _sum: {
          subtotal: true,
          taxAmount: true,
          totalAmount: true,
          shippingAmount: true,
        },
        _count: true,
      });

      // Get nexus states
      const business = await prisma.business.findFirst({
        where: { userId },
        include: { nexusStates: true },
      });

      const nexusStateCodes = new Set(
        business?.nexusStates.filter(n => n.hasNexus).map(n => n.stateCode) || []
      );

      // Build CSV
      const headers = ['State Code', 'State Name', 'Has Nexus', 'Orders', 'Subtotal', 'Shipping', 'Tax Collected', 'Total Sales'];
      csv = headers.join(',') + '\n';

      const sortedStates = salesByState
        .filter(row => row.shippingState)
        .sort((a, b) => Number(b._sum.totalAmount || 0) - Number(a._sum.totalAmount || 0));

      for (const row of sortedStates) {
        const state = row.shippingState!;
        csv += [
          escapeCSV(state),
          escapeCSV(STATE_NAMES[state] || state),
          nexusStateCodes.has(state) ? 'Yes' : 'No',
          row._count,
          formatCurrency(Number(row._sum.subtotal || 0)),
          formatCurrency(Number(row._sum.shippingAmount || 0)),
          formatCurrency(Number(row._sum.taxAmount || 0)),
          formatCurrency(Number(row._sum.totalAmount || 0)),
        ].join(',') + '\n';
      }

      // Add totals row
      const totals = sortedStates.reduce(
        (acc, row) => ({
          orderCount: acc.orderCount + row._count,
          subtotal: acc.subtotal + Number(row._sum.subtotal || 0),
          shipping: acc.shipping + Number(row._sum.shippingAmount || 0),
          taxCollected: acc.taxCollected + Number(row._sum.taxAmount || 0),
          totalSales: acc.totalSales + Number(row._sum.totalAmount || 0),
        }),
        { orderCount: 0, subtotal: 0, shipping: 0, taxCollected: 0, totalSales: 0 }
      );

      csv += '\n';
      csv += [
        'TOTALS',
        '',
        '',
        totals.orderCount,
        formatCurrency(totals.subtotal),
        formatCurrency(totals.shipping),
        formatCurrency(totals.taxCollected),
        formatCurrency(totals.totalSales),
      ].join(',') + '\n';

      filename = `sails-sales-by-state-${formatDate(startDate)}-to-${formatDate(endDate)}.csv`;

    } else {
      // Detailed order export
      const orders = await prisma.importedOrder.findMany({
        where: whereClause,
        orderBy: { orderDate: 'desc' },
        take: 10000, // Limit to prevent massive exports
      });

      const headers = [
        'Order Date',
        'Order Number',
        'Platform',
        'Status',
        'State',
        'City',
        'ZIP',
        'Subtotal',
        'Shipping',
        'Tax',
        'Total',
        'Customer Email',
      ];
      csv = headers.join(',') + '\n';

      for (const order of orders) {
        csv += [
          formatDate(order.orderDate),
          escapeCSV(order.orderNumber || order.platformOrderId),
          escapeCSV(order.platform),
          escapeCSV(order.status),
          escapeCSV(order.shippingState),
          escapeCSV(order.shippingCity),
          escapeCSV(order.shippingZip),
          formatCurrency(Number(order.subtotal)),
          formatCurrency(Number(order.shippingAmount)),
          formatCurrency(Number(order.taxAmount)),
          formatCurrency(Number(order.totalAmount)),
          escapeCSV(order.customerEmail),
        ].join(',') + '\n';
      }

      const stateLabel = stateFilter ? `-${stateFilter}` : '';
      filename = `sails-orders${stateLabel}-${formatDate(startDate)}-to-${formatDate(endDate)}.csv`;
    }

    // Return CSV as downloadable file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}

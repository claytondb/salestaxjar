import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/calculations/summary
 * 
 * Get calculation summary/stats for the current user
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [monthlyStats, lastMonthStats, yearlyStats, byState, recentCalculations] = await Promise.all([
      // This month
      prisma.calculation.aggregate({
        where: {
          userId: user.id,
          createdAt: { gte: startOfMonth },
        },
        _sum: {
          amount: true,
          taxAmount: true,
        },
        _count: true,
      }),
      // Last month
      prisma.calculation.aggregate({
        where: {
          userId: user.id,
          createdAt: { 
            gte: startOfLastMonth,
            lte: endOfLastMonth,
          },
        },
        _sum: {
          amount: true,
          taxAmount: true,
        },
        _count: true,
      }),
      // Year to date
      prisma.calculation.aggregate({
        where: {
          userId: user.id,
          createdAt: { gte: startOfYear },
        },
        _sum: {
          amount: true,
          taxAmount: true,
        },
        _count: true,
      }),
      // By state (top 10)
      prisma.calculation.groupBy({
        by: ['stateCode', 'stateName'],
        where: {
          userId: user.id,
          createdAt: { gte: startOfYear },
        },
        _sum: {
          amount: true,
          taxAmount: true,
        },
        _count: true,
        orderBy: {
          _sum: {
            taxAmount: 'desc',
          },
        },
        take: 10,
      }),
      // Recent calculations
      prisma.calculation.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Calculate month-over-month change
    const currentMonthTax = monthlyStats._sum.taxAmount?.toNumber() ?? 0;
    const lastMonthTax = lastMonthStats._sum.taxAmount?.toNumber() ?? 0;
    const monthOverMonthChange = lastMonthTax > 0 
      ? ((currentMonthTax - lastMonthTax) / lastMonthTax) * 100 
      : 0;

    return NextResponse.json({
      summary: {
        thisMonth: {
          totalSales: monthlyStats._sum.amount?.toNumber() ?? 0,
          totalTax: currentMonthTax,
          count: monthlyStats._count,
        },
        lastMonth: {
          totalSales: lastMonthStats._sum.amount?.toNumber() ?? 0,
          totalTax: lastMonthTax,
          count: lastMonthStats._count,
        },
        yearToDate: {
          totalSales: yearlyStats._sum.amount?.toNumber() ?? 0,
          totalTax: yearlyStats._sum.taxAmount?.toNumber() ?? 0,
          count: yearlyStats._count,
        },
        monthOverMonthChange: Math.round(monthOverMonthChange * 10) / 10,
        byState: byState.map(s => ({
          stateCode: s.stateCode,
          state: s.stateName,
          totalSales: s._sum.amount?.toNumber() ?? 0,
          taxAmount: s._sum.taxAmount?.toNumber() ?? 0,
          count: s._count,
        })),
        recentCalculations: recentCalculations.map(c => ({
          id: c.id,
          amount: c.amount.toNumber(),
          state: c.stateName,
          stateCode: c.stateCode,
          rate: c.taxRate.toNumber() * 100,
          taxAmount: c.taxAmount.toNumber(),
          createdAt: c.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching calculation summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch summary' },
      { status: 500 }
    );
  }
}

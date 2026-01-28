import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for creating calculations
const calculationSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  stateCode: z.string().length(2),
  stateName: z.string().max(50),
  category: z.string().max(50).default('general'),
  taxRate: z.number().min(0).max(1), // Rate as decimal (0.0825 = 8.25%)
  taxAmount: z.number().min(0),
  total: z.number().positive(),
  fromAddress: z.string().optional().nullable(),
  toAddress: z.string().optional().nullable(),
  source: z.enum(['manual', 'api', 'import']).default('manual'),
});

const bulkCalculationsSchema = z.object({
  calculations: z.array(calculationSchema),
});

/**
 * GET /api/calculations
 * 
 * Get user's calculation history
 * Query params: limit, offset, stateCode, startDate, endDate
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const stateCode = searchParams.get('stateCode');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause
    const where: { 
      userId: string; 
      stateCode?: string; 
      createdAt?: { gte?: Date; lte?: Date } 
    } = {
      userId: user.id,
    };

    if (stateCode) {
      where.stateCode = stateCode;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [calculations, total] = await Promise.all([
      prisma.calculation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.calculation.count({ where }),
    ]);

    return NextResponse.json({
      calculations: calculations.map(c => ({
        id: c.id,
        amount: c.amount.toNumber(),
        state: c.stateName,
        stateCode: c.stateCode,
        category: c.category,
        rate: c.taxRate.toNumber() * 100, // Convert to percentage
        taxAmount: c.taxAmount.toNumber(),
        total: c.total.toNumber(),
        source: c.source,
        createdAt: c.createdAt.toISOString(),
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching calculations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calculations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calculations
 * 
 * Save a new calculation or bulk save calculations
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Check if it's a bulk request
    if (body.calculations && Array.isArray(body.calculations)) {
      const validation = bulkCalculationsSchema.safeParse(body);
      
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.issues[0]?.message || 'Invalid input' },
          { status: 400 }
        );
      }

      const calculations = await prisma.calculation.createMany({
        data: validation.data.calculations.map(calc => ({
          userId: user.id,
          amount: calc.amount,
          stateCode: calc.stateCode,
          stateName: calc.stateName,
          category: calc.category,
          taxRate: calc.taxRate,
          taxAmount: calc.taxAmount,
          total: calc.total,
          fromAddress: calc.fromAddress ? JSON.stringify(calc.fromAddress) : null,
          toAddress: calc.toAddress ? JSON.stringify(calc.toAddress) : null,
          source: calc.source,
        })),
      });

      return NextResponse.json({ 
        success: true, 
        count: calculations.count 
      }, { status: 201 });
    }

    // Single calculation
    const validation = calculationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const data = validation.data;

    const calculation = await prisma.calculation.create({
      data: {
        userId: user.id,
        amount: data.amount,
        stateCode: data.stateCode,
        stateName: data.stateName,
        category: data.category,
        taxRate: data.taxRate,
        taxAmount: data.taxAmount,
        total: data.total,
        fromAddress: data.fromAddress ? JSON.stringify(data.fromAddress) : null,
        toAddress: data.toAddress ? JSON.stringify(data.toAddress) : null,
        source: data.source,
      },
    });

    return NextResponse.json({
      calculation: {
        id: calculation.id,
        amount: calculation.amount.toNumber(),
        state: calculation.stateName,
        stateCode: calculation.stateCode,
        category: calculation.category,
        rate: calculation.taxRate.toNumber() * 100,
        taxAmount: calculation.taxAmount.toNumber(),
        total: calculation.total.toNumber(),
        source: calculation.source,
        createdAt: calculation.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error saving calculation:', error);
    return NextResponse.json(
      { error: 'Failed to save calculation' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calculations
 * 
 * Delete calculations
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll) {
      // Delete all calculations for user
      const result = await prisma.calculation.deleteMany({
        where: { userId: user.id },
      });
      return NextResponse.json({ success: true, deleted: result.count });
    }

    if (!id) {
      return NextResponse.json({ error: 'Calculation ID required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.calculation.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Calculation not found' }, { status: 404 });
    }

    await prisma.calculation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting calculation:', error);
    return NextResponse.json(
      { error: 'Failed to delete calculation' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calculations/summary
 * 
 * Get calculation summary/stats
 */
export async function getSummary(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [monthlyStats, yearlyStats, byState] = await Promise.all([
    prisma.calculation.aggregate({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
      _sum: {
        amount: true,
        taxAmount: true,
      },
      _count: true,
    }),
    prisma.calculation.aggregate({
      where: {
        userId,
        createdAt: { gte: startOfYear },
      },
      _sum: {
        amount: true,
        taxAmount: true,
      },
      _count: true,
    }),
    prisma.calculation.groupBy({
      by: ['stateCode', 'stateName'],
      where: {
        userId,
        createdAt: { gte: startOfYear },
      },
      _sum: {
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
  ]);

  return {
    monthly: {
      totalSales: monthlyStats._sum.amount?.toNumber() ?? 0,
      totalTax: monthlyStats._sum.taxAmount?.toNumber() ?? 0,
      count: monthlyStats._count,
    },
    yearly: {
      totalSales: yearlyStats._sum.amount?.toNumber() ?? 0,
      totalTax: yearlyStats._sum.taxAmount?.toNumber() ?? 0,
      count: yearlyStats._count,
    },
    byState: byState.map(s => ({
      stateCode: s.stateCode,
      state: s.stateName,
      taxAmount: s._sum.taxAmount?.toNumber() ?? 0,
      count: s._count,
    })),
  };
}

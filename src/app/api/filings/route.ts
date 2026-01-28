import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schemas
const filingSchema = z.object({
  stateCode: z.string().length(2),
  period: z.enum(['monthly', 'quarterly', 'annual']),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  dueDate: z.string().datetime(),
  status: z.enum(['pending', 'filed', 'overdue', 'extension']).default('pending'),
  estimatedTax: z.number().optional(),
  actualTax: z.number().optional(),
  notes: z.string().max(1000).optional(),
});

const updateFilingSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'filed', 'overdue', 'extension']).optional(),
  actualTax: z.number().optional(),
  confirmationNumber: z.string().max(100).optional(),
  filedAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});

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
  DC: 'District of Columbia',
};

/**
 * GET /api/filings
 * 
 * Get all filings for the user's primary business
 * Query params: status, upcoming (days), year
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const upcoming = searchParams.get('upcoming'); // days
    const year = searchParams.get('year');

    // Get user's primary business
    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!business) {
      return NextResponse.json({ filings: [], businessId: null });
    }

    // Build where clause
    const where: { businessId: string; status?: string; dueDate?: { gte?: Date; lte?: Date }; periodStart?: { gte?: Date; lt?: Date } } = {
      businessId: business.id,
    };

    if (status) {
      where.status = status;
    }

    if (upcoming) {
      const days = parseInt(upcoming, 10);
      const now = new Date();
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      where.dueDate = {
        gte: now,
        lte: futureDate,
      };
    }

    if (year) {
      const y = parseInt(year, 10);
      where.periodStart = {
        gte: new Date(y, 0, 1),
        lt: new Date(y + 1, 0, 1),
      };
    }

    const filings = await prisma.filing.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json({
      filings: filings.map(f => ({
        id: f.id,
        state: f.stateName,
        stateCode: f.stateCode,
        period: f.period,
        periodStart: f.periodStart.toISOString(),
        periodEnd: f.periodEnd.toISOString(),
        dueDate: f.dueDate.toISOString(),
        status: f.status,
        estimatedTax: f.estimatedTax?.toNumber() ?? null,
        actualTax: f.actualTax?.toNumber() ?? null,
        filedAt: f.filedAt?.toISOString() ?? null,
        confirmationNumber: f.confirmationNumber,
        notes: f.notes,
      })),
      businessId: business.id,
    });
  } catch (error) {
    console.error('Error fetching filings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/filings
 * 
 * Create a new filing
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = filingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Get user's primary business
    let business = await prisma.business.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!business) {
      business = await prisma.business.create({
        data: {
          userId: user.id,
          name: `${user.name}'s Business`,
        },
      });
    }

    const filing = await prisma.filing.create({
      data: {
        businessId: business.id,
        stateCode: data.stateCode,
        stateName: STATE_NAMES[data.stateCode] || data.stateCode,
        period: data.period,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        dueDate: new Date(data.dueDate),
        status: data.status,
        estimatedTax: data.estimatedTax,
        notes: data.notes,
      },
    });

    return NextResponse.json({
      filing: {
        id: filing.id,
        state: filing.stateName,
        stateCode: filing.stateCode,
        period: filing.period,
        periodStart: filing.periodStart.toISOString(),
        periodEnd: filing.periodEnd.toISOString(),
        dueDate: filing.dueDate.toISOString(),
        status: filing.status,
        estimatedTax: filing.estimatedTax?.toNumber() ?? null,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating filing:', error);
    return NextResponse.json(
      { error: 'Failed to create filing' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/filings
 * 
 * Update a filing (e.g., mark as filed)
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = updateFilingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { id, status, actualTax, confirmationNumber, filedAt, notes } = validation.data;

    // Verify ownership
    const business = await prisma.business.findFirst({
      where: { userId: user.id },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const existing = await prisma.filing.findFirst({
      where: { id, businessId: business.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Filing not found' }, { status: 404 });
    }

    const updateData: {
      status?: string;
      actualTax?: number;
      confirmationNumber?: string;
      filedAt?: Date;
      notes?: string;
    } = {};

    if (status !== undefined) updateData.status = status;
    if (actualTax !== undefined) updateData.actualTax = actualTax;
    if (confirmationNumber !== undefined) updateData.confirmationNumber = confirmationNumber;
    if (filedAt !== undefined) updateData.filedAt = new Date(filedAt);
    if (notes !== undefined) updateData.notes = notes;

    // Auto-set filedAt when marking as filed
    if (status === 'filed' && !filedAt) {
      updateData.filedAt = new Date();
    }

    const filing = await prisma.filing.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      filing: {
        id: filing.id,
        state: filing.stateName,
        stateCode: filing.stateCode,
        period: filing.period,
        periodStart: filing.periodStart.toISOString(),
        periodEnd: filing.periodEnd.toISOString(),
        dueDate: filing.dueDate.toISOString(),
        status: filing.status,
        estimatedTax: filing.estimatedTax?.toNumber() ?? null,
        actualTax: filing.actualTax?.toNumber() ?? null,
        filedAt: filing.filedAt?.toISOString() ?? null,
        confirmationNumber: filing.confirmationNumber,
        notes: filing.notes,
      },
    });
  } catch (error) {
    console.error('Error updating filing:', error);
    return NextResponse.json(
      { error: 'Failed to update filing' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/filings/generate
 * 
 * Auto-generate filings based on nexus states
 */
export async function generateFilings(userId: string) {
  const business = await prisma.business.findFirst({
    where: { userId },
    include: {
      nexusStates: {
        where: { hasNexus: true },
      },
    },
  });

  if (!business || business.nexusStates.length === 0) {
    return [];
  }

  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3);
  const filings = [];

  for (const nexus of business.nexusStates) {
    // Generate next quarter's filing if not exists
    const quarterEndMonths = [2, 5, 8, 11]; // March, June, September, December
    const nextQuarterEnd = quarterEndMonths[(currentQuarter + 1) % 4];
    const year = currentQuarter === 3 ? now.getFullYear() + 1 : now.getFullYear();
    
    const periodStart = new Date(year, nextQuarterEnd - 2, 1); // First day of quarter
    const periodEnd = new Date(year, nextQuarterEnd + 1, 0); // Last day of quarter
    const dueDate = new Date(year, nextQuarterEnd + 1, 20); // 20th of following month

    // Check if filing already exists
    const existing = await prisma.filing.findFirst({
      where: {
        businessId: business.id,
        stateCode: nexus.stateCode,
        periodStart,
      },
    });

    if (!existing) {
      const filing = await prisma.filing.create({
        data: {
          businessId: business.id,
          stateCode: nexus.stateCode,
          stateName: nexus.stateName,
          period: 'quarterly',
          periodStart,
          periodEnd,
          dueDate,
          status: 'pending',
        },
      });
      filings.push(filing);
    }
  }

  return filings;
}

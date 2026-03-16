import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  getFilingDeadlines,
  getStateFilingConfig,
  type FilingPeriod,
} from '@/lib/filing-deadlines';

const generateSchema = z.object({
  year: z.number().int().min(2020).max(2035).optional(),
  /**
   * Override the filing period for all states.
   * If omitted, each state uses its default period from STATE_FILING_CONFIGS.
   */
  periodOverride: z.enum(['monthly', 'quarterly', 'annual']).optional(),
  /**
   * If true, only generate deadlines for periods that haven't passed yet
   * (period end date >= today). Useful mid-year. Default: false (generate all).
   */
  remainingOnly: z.boolean().optional().default(false),
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
 * POST /api/filings/generate
 *
 * Auto-generate filing deadlines for all nexus states.
 *
 * Body (all optional):
 *   year          – Calendar year to generate for (default: current year)
 *   periodOverride – Force a specific period type for all states
 *   remainingOnly  – Only generate deadlines that haven't passed yet
 *
 * The endpoint is idempotent: it skips any (businessId, stateCode, periodStart)
 * combination that already exists in the database.
 *
 * Response:
 *   { created: number, skipped: number, filings: Filing[] }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const validation = generateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { year: yearParam, periodOverride, remainingOnly } = validation.data;
    const year = yearParam ?? new Date().getFullYear();
    const today = new Date();

    // Get user's primary business and nexus states
    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        nexusStates: {
          where: { hasNexus: true },
          orderBy: { stateCode: 'asc' },
        },
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'No business profile found. Please complete your setup first.' },
        { status: 400 }
      );
    }

    if (business.nexusStates.length === 0) {
      return NextResponse.json(
        { error: 'No nexus states configured. Add nexus states before generating deadlines.' },
        { status: 400 }
      );
    }

    const created: object[] = [];
    let skippedCount = 0;

    for (const nexus of business.nexusStates) {
      const stateCode = nexus.stateCode.toUpperCase();
      const stateName = nexus.stateName || STATE_NAMES[stateCode] || stateCode;

      // Get all deadlines for this state/year
      let deadlines = getFilingDeadlines(stateCode, year, periodOverride as FilingPeriod | undefined);

      // Filter to remaining periods if requested
      if (remainingOnly) {
        deadlines = deadlines.filter(
          d => d.periodEnd >= today || d.dueDate >= today
        );
      }

      for (const deadline of deadlines) {
        // Idempotency check: skip if this period already exists
        const existing = await prisma.filing.findFirst({
          where: {
            businessId: business.id,
            stateCode,
            periodStart: deadline.periodStart,
          },
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        const config = getStateFilingConfig(stateCode);
        const period = periodOverride ?? config.defaultPeriod;

        const filing = await prisma.filing.create({
          data: {
            businessId: business.id,
            stateCode,
            stateName,
            period,
            periodStart: deadline.periodStart,
            periodEnd: deadline.periodEnd,
            dueDate: deadline.dueDate,
            status: deadline.dueDate < today ? 'overdue' : 'pending',
          },
        });

        created.push({
          id: filing.id,
          state: stateName,
          stateCode,
          period: filing.period,
          periodLabel: deadline.periodLabel,
          periodStart: filing.periodStart.toISOString(),
          periodEnd: filing.periodEnd.toISOString(),
          dueDate: filing.dueDate.toISOString(),
          status: filing.status,
        });
      }
    }

    return NextResponse.json({
      created: created.length,
      skipped: skippedCount,
      year,
      nexusStates: business.nexusStates.length,
      filings: created,
    }, { status: 201 });

  } catch (error) {
    console.error('Error generating filings:', error);
    return NextResponse.json(
      { error: 'Failed to generate filings' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/filings/generate
 *
 * Preview what would be generated (dry-run) without writing to the database.
 * Query params: year, periodOverride, remainingOnly
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const periodOverride = searchParams.get('periodOverride') as FilingPeriod | null;
    const remainingOnly = searchParams.get('remainingOnly') === 'true';
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
    const today = new Date();

    if (isNaN(year) || year < 2020 || year > 2035) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
    }

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        nexusStates: {
          where: { hasNexus: true },
          orderBy: { stateCode: 'asc' },
        },
      },
    });

    if (!business) {
      return NextResponse.json({ preview: [], nexusStates: 0, year });
    }

    const preview: object[] = [];
    let existingCount = 0;

    for (const nexus of business.nexusStates) {
      const stateCode = nexus.stateCode.toUpperCase();
      const stateName = nexus.stateName || STATE_NAMES[stateCode] || stateCode;
      let deadlines = getFilingDeadlines(stateCode, year, periodOverride ?? undefined);

      if (remainingOnly) {
        deadlines = deadlines.filter(
          d => d.periodEnd >= today || d.dueDate >= today
        );
      }

      for (const deadline of deadlines) {
        const existing = await prisma.filing.findFirst({
          where: {
            businessId: business.id,
            stateCode,
            periodStart: deadline.periodStart,
          },
        });

        if (existing) {
          existingCount++;
          continue;
        }

        preview.push({
          state: stateName,
          stateCode,
          period: periodOverride ?? getStateFilingConfig(stateCode).defaultPeriod,
          periodLabel: deadline.periodLabel,
          periodStart: deadline.periodStart.toISOString(),
          periodEnd: deadline.periodEnd.toISOString(),
          dueDate: deadline.dueDate.toISOString(),
          status: deadline.dueDate < today ? 'overdue' : 'pending',
        });
      }
    }

    return NextResponse.json({
      preview,
      wouldCreate: preview.length,
      wouldSkip: existingCount,
      year,
      nexusStates: business.nexusStates.length,
    });

  } catch (error) {
    console.error('Error previewing filings:', error);
    return NextResponse.json(
      { error: 'Failed to preview filings' },
      { status: 500 }
    );
  }
}

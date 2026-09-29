import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { offeredFilingPeriods } from '@/lib/filing-deadlines';
import { setFilingFrequency } from '@/lib/filing-schedule';

const schema = z.object({
  stateCode: z.string().length(2),
  period: z.enum(['monthly', 'quarterly', 'annual']),
});

/**
 * POST /api/filings/frequency  { stateCode, period }
 *
 * Set how often the seller files in a state (the state assigns this at
 * registration). Upcoming unfiled returns for that state are replaced with
 * ones at the new frequency; filed and overdue returns are kept.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Choose a state and a filing frequency' }, { status: 400 });
  }
  const stateCode = parsed.data.stateCode.toUpperCase();
  const { period } = parsed.data;

  const business = await prisma.business.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, nexusStates: { where: { stateCode, hasNexus: true }, select: { stateCode: true, stateName: true } } },
  });
  const state = business?.nexusStates[0];
  if (!business || !state) {
    return NextResponse.json({ error: 'Mark this state as one where you collect sales tax first.' }, { status: 400 });
  }
  if (!offeredFilingPeriods(stateCode).includes(period)) {
    return NextResponse.json({ error: `${state.stateName} doesn't offer ${period} filing.` }, { status: 400 });
  }

  try {
    const result = await setFilingFrequency(business.id, state, period);
    return NextResponse.json({ ...result, stateCode, period });
  } catch (error) {
    console.error('Filing frequency error:', error);
    return NextResponse.json({ error: 'Could not update the filing frequency. Please try again.' }, { status: 500 });
  }
}

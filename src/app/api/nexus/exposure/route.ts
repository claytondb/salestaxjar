import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { buildNexusReport } from '@/lib/nexus-data';

export const dynamic = 'force-dynamic';

/**
 * GET /api/nexus/exposure
 *
 * Every state's result for the signed-in seller, most urgent first:
 * status, why, how sure, what to do next and the sources behind the rule,
 * plus a summary and the top three actions. See src/lib/nexus-engine.ts.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const report = await buildNexusReport(user.id);
    return NextResponse.json(report, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error fetching nexus exposure:', error);
    return NextResponse.json({ error: 'Failed to fetch nexus exposure data' }, { status: 500 });
  }
}

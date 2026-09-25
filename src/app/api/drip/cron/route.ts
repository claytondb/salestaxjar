/**
 * GET /api/drip/cron
 *
 * Runs the onboarding (drip) emails on demand. The scheduled daily run happens
 * in /api/cron/daily, which only sends these when ONBOARDING_EMAILS_ENABLED=true.
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>` (falls back to DRIP_SECRET).
 * See src/lib/drip.ts for eligibility rules.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron-auth';
import { runDripCampaign } from '@/lib/drip';

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = await runDripCampaign();

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    results,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserAlerts, markAlertsRead } from '@/lib/nexus-alerts';

/**
 * GET /api/nexus/alerts
 * 
 * Fetch user's nexus alerts.
 * Query params:
 *   - unreadOnly=true — only return unread alerts
 *   - limit=N — max number of alerts to return (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const result = await getUserAlerts(user.id, { unreadOnly, limit });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching nexus alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nexus alerts' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/nexus/alerts
 * 
 * Mark alerts as read.
 * Body: { alertIds?: string[] }
 *   - If alertIds is provided, mark those specific alerts as read
 *   - If omitted, mark ALL alerts as read
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { alertIds } = body;

    const count = await markAlertsRead(user.id, alertIds);

    return NextResponse.json({ success: true, marked: count });
  } catch (error) {
    console.error('Error marking alerts as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark alerts as read' },
      { status: 500 }
    );
  }
}

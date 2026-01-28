import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { 
  getUserConnections, 
  getPlatformConfigurations,
  deleteConnection,
} from '@/lib/platforms';

/**
 * GET /api/platforms
 * 
 * Get all platform connections and configuration status for the current user
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's connections
    const connections = await getUserConnections(user.id);
    
    // Get platform configurations (which platforms are enabled)
    const configurations = getPlatformConfigurations();

    // Merge connections with configurations
    const platforms = configurations.map(config => {
      const userConnections = connections.filter(c => c.platform === config.platform);
      
      return {
        ...config,
        connections: userConnections,
        connectedCount: userConnections.length,
      };
    });

    return NextResponse.json({
      platforms,
      totalConnections: connections.length,
    });
  } catch (error) {
    console.error('Error fetching platforms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platforms' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/platforms
 * 
 * Disconnect a platform
 * Body: { platform: string, platformId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { platform, platformId } = body;

    if (!platform || !platformId) {
      return NextResponse.json(
        { error: 'Missing platform or platformId' },
        { status: 400 }
      );
    }

    const result = await deleteConnection(user.id, platform, platformId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting platform:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect platform' },
      { status: 500 }
    );
  }
}

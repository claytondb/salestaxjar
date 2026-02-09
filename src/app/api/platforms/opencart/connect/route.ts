/**
 * OpenCart Connect API
 * 
 * POST /api/platforms/opencart/connect
 * 
 * Validates credentials and saves connection to database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { validateCredentials, saveConnection } from '@/lib/platforms/opencart';
import { userCanConnectPlatform, tierGateError } from '@/lib/plans';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Tier gate: OpenCart requires Pro or higher
    const access = userCanConnectPlatform(user, 'opencart');
    if (!access.allowed) {
      return NextResponse.json(
        tierGateError(access.userPlan, access.requiredPlan, 'platform_opencart'),
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { storeUrl, apiUsername, apiKey, storeName } = body;

    // Validate required fields
    if (!storeUrl || typeof storeUrl !== 'string' || !storeUrl.trim()) {
      return NextResponse.json(
        { error: 'Store URL is required' },
        { status: 400 }
      );
    }

    if (!apiUsername || typeof apiUsername !== 'string' || !apiUsername.trim()) {
      return NextResponse.json(
        { error: 'API Username is required' },
        { status: 400 }
      );
    }

    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      return NextResponse.json(
        { error: 'API Key is required' },
        { status: 400 }
      );
    }

    // Validate credentials by attempting login
    const validation = await validateCredentials({
      storeUrl: storeUrl.trim(),
      apiUsername: apiUsername.trim(),
      apiKey: apiKey.trim(),
    });

    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'Invalid credentials', 
          details: validation.error,
          hint: 'Make sure your store URL is correct, API credentials are valid, and your server IP is whitelisted in OpenCart Admin → System → Users → API → IP Addresses.'
        },
        { status: 400 }
      );
    }

    // Save connection to database
    const saveResult = await saveConnection(
      user.id,
      { 
        storeUrl: storeUrl.trim(), 
        apiUsername: apiUsername.trim(),
        apiKey: apiKey.trim() 
      },
      storeName
    );

    if (!saveResult.success) {
      return NextResponse.json(
        { error: 'Failed to save connection', details: saveResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      connectionId: saveResult.connectionId,
      store: {
        name: storeName || 'OpenCart Store',
      },
    });

  } catch (error) {
    console.error('OpenCart connect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

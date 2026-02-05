/**
 * Ecwid Connect API
 * 
 * POST /api/platforms/ecwid/connect
 * 
 * Validates credentials and saves connection to database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { validateCredentials, saveConnection } from '@/lib/platforms/ecwid';
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

    // Tier gate: Ecwid requires Pro or higher
    const access = userCanConnectPlatform(user, 'ecwid');
    if (!access.allowed) {
      return NextResponse.json(
        tierGateError(access.userPlan, access.requiredPlan, 'platform_ecwid'),
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { storeId, apiToken, storeName } = body;

    // Validate required fields
    if (!storeId || typeof storeId !== 'string' || !storeId.trim()) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      );
    }

    if (!apiToken || typeof apiToken !== 'string' || !apiToken.trim()) {
      return NextResponse.json(
        { error: 'API Token is required' },
        { status: 400 }
      );
    }

    // Validate credentials by fetching store profile
    const validation = await validateCredentials({
      storeId: storeId.trim(),
      apiToken: apiToken.trim(),
    });

    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'Invalid credentials', 
          details: validation.error,
          hint: 'Make sure your Store ID and API Token are correct. Find them in Ecwid Admin → Settings → API → Access tokens.'
        },
        { status: 400 }
      );
    }

    // Get store name from profile if not provided
    const finalStoreName = storeName || 
      validation.storeInfo?.settings?.storeName || 
      validation.storeInfo?.account?.accountName ||
      'Ecwid Store';

    // Save connection to database
    const saveResult = await saveConnection(
      user.id,
      { storeId: storeId.trim(), apiToken: apiToken.trim() },
      finalStoreName
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
        name: finalStoreName,
        storeId: validation.storeInfo?.generalInfo?.storeId,
      },
    });

  } catch (error) {
    console.error('Ecwid connect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

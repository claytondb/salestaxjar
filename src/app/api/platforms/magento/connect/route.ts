/**
 * Magento Connect API
 * 
 * POST /api/platforms/magento/connect
 * 
 * Validates credentials and saves connection to database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { validateCredentials, saveConnection } from '@/lib/platforms/magento';
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

    // Tier gate: Magento requires Pro or higher
    const access = userCanConnectPlatform(user, 'magento');
    if (!access.allowed) {
      return NextResponse.json(
        tierGateError(access.userPlan, access.requiredPlan, 'platform_magento'),
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { storeUrl, accessToken, storeName } = body;

    // Validate required fields
    if (!storeUrl || typeof storeUrl !== 'string' || !storeUrl.trim()) {
      return NextResponse.json(
        { error: 'Store URL is required' },
        { status: 400 }
      );
    }

    if (!accessToken || typeof accessToken !== 'string' || !accessToken.trim()) {
      return NextResponse.json(
        { error: 'Access Token is required' },
        { status: 400 }
      );
    }

    // Validate credentials by fetching store info
    const validation = await validateCredentials({
      storeUrl: storeUrl.trim(),
      accessToken: accessToken.trim(),
    });

    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'Invalid credentials', 
          details: validation.error,
          hint: 'Make sure your store URL is correct and your Access Token has the required permissions. Go to System → Integrations in your Magento admin to create or verify your integration.'
        },
        { status: 400 }
      );
    }

    // Save connection to database
    const saveResult = await saveConnection(
      user.id,
      { storeUrl: storeUrl.trim(), accessToken: accessToken.trim() },
      storeName || validation.storeInfo?.name
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
        name: validation.storeInfo?.name || storeName || 'Magento Store',
        code: validation.storeInfo?.code,
        currency: validation.storeInfo?.base_currency_code,
      },
    });

  } catch (error) {
    console.error('Magento connect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

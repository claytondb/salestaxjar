/**
 * PrestaShop Connect API
 * 
 * POST /api/platforms/prestashop/connect
 * 
 * Validates credentials and saves connection to database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { validateCredentials, saveConnection } from '@/lib/platforms/prestashop';
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

    // Tier gate: PrestaShop requires Pro or higher
    const access = userCanConnectPlatform(user, 'prestashop');
    if (!access.allowed) {
      return NextResponse.json(
        tierGateError(access.userPlan, access.requiredPlan, 'platform_prestashop'),
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { storeUrl, apiKey, storeName } = body;

    // Validate required fields
    if (!storeUrl || typeof storeUrl !== 'string' || !storeUrl.trim()) {
      return NextResponse.json(
        { error: 'Store URL is required' },
        { status: 400 }
      );
    }

    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      return NextResponse.json(
        { error: 'API Key is required' },
        { status: 400 }
      );
    }

    // Validate credentials by making a test request
    const validation = await validateCredentials({
      storeUrl: storeUrl.trim(),
      apiKey: apiKey.trim(),
    });

    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'Invalid credentials', 
          details: validation.error,
          hint: 'Make sure your store URL is correct and your API key has the required permissions. Go to Advanced Parameters → Webservice in your PrestaShop admin to verify your API key.'
        },
        { status: 400 }
      );
    }

    // Save connection to database
    const saveResult = await saveConnection(
      user.id,
      { storeUrl: storeUrl.trim(), apiKey: apiKey.trim() },
      storeName || validation.storeInfo?.shop_name
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
        name: validation.storeInfo?.shop_name || storeName || 'PrestaShop Store',
      },
    });

  } catch (error) {
    console.error('PrestaShop connect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

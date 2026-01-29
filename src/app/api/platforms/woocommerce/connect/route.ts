/**
 * WooCommerce Connect API
 * 
 * POST /api/platforms/woocommerce/connect
 * 
 * Validates credentials and saves connection to database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { 
  validateCredentials, 
  saveConnection, 
  normalizeStoreUrl 
} from '@/lib/platforms/woocommerce';
import { z } from 'zod';

const connectSchema = z.object({
  storeUrl: z.string().min(1, 'Store URL is required'),
  consumerKey: z.string().min(1, 'Consumer Key is required').startsWith('ck_', 'Consumer Key should start with ck_'),
  consumerSecret: z.string().min(1, 'Consumer Secret is required').startsWith('cs_', 'Consumer Secret should start with cs_'),
});

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

    // Parse and validate request body
    const body = await request.json();
    const parsed = connectSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { storeUrl, consumerKey, consumerSecret } = parsed.data;
    const normalizedUrl = normalizeStoreUrl(storeUrl);

    // Validate credentials by fetching store info
    const validation = await validateCredentials({
      storeUrl: normalizedUrl,
      consumerKey,
      consumerSecret,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'Invalid credentials', 
          details: validation.error,
          hint: 'Make sure your store URL is correct and API keys have Read access.'
        },
        { status: 400 }
      );
    }

    // Save connection to database
    const storeName = validation.storeInfo?.name || normalizedUrl;
    const saveResult = await saveConnection(
      user.id,
      { storeUrl: normalizedUrl, consumerKey, consumerSecret },
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
        name: validation.storeInfo?.name,
        url: normalizedUrl,
        wcVersion: validation.storeInfo?.wc_version,
        currency: validation.storeInfo?.currency,
      },
    });

  } catch (error) {
    console.error('WooCommerce connect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

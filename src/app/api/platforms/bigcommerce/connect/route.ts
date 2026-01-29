/**
 * BigCommerce Connect API
 * 
 * POST /api/platforms/bigcommerce/connect
 * 
 * Validates credentials and saves connection to database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { validateCredentials, saveConnection } from '@/lib/platforms/bigcommerce';
import { z } from 'zod';

const connectSchema = z.object({
  storeHash: z.string().min(1, 'Store Hash is required'),
  accessToken: z.string().min(1, 'Access Token is required'),
  storeName: z.string().optional(),
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

    const { storeHash, accessToken, storeName } = parsed.data;

    // Clean up store hash (remove any URL parts if pasted)
    const cleanStoreHash = storeHash.replace(/^.*stores\//, '').replace(/\/.*$/, '').trim();

    // Validate credentials by fetching store info
    const validation = await validateCredentials({
      storeHash: cleanStoreHash,
      accessToken,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'Invalid credentials', 
          details: validation.error,
          hint: 'Make sure your Store Hash and Access Token are correct. The Store Hash is found in your API path (e.g., stores/abc123/v3).'
        },
        { status: 400 }
      );
    }

    // Save connection to database
    const saveResult = await saveConnection(
      user.id,
      { storeHash: cleanStoreHash, accessToken },
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
        name: validation.storeInfo?.name || storeName || 'BigCommerce Store',
        domain: validation.storeInfo?.domain,
        plan: validation.storeInfo?.plan_name,
      },
    });

  } catch (error) {
    console.error('BigCommerce connect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

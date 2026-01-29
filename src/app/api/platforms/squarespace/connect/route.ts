/**
 * Squarespace Connect API
 * 
 * POST /api/platforms/squarespace/connect
 * 
 * Validates API key and saves connection to database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { validateCredentials, saveConnection } from '@/lib/platforms/squarespace';
import { z } from 'zod';

const connectSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
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

    const { apiKey, storeName } = parsed.data;

    // Validate API key by making a test request
    const validation = await validateCredentials(apiKey);

    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'Invalid API key', 
          details: validation.error,
          hint: 'Make sure your API key has Orders API Read permission. This requires Commerce Advanced plan.'
        },
        { status: 400 }
      );
    }

    // Save connection to database
    const saveResult = await saveConnection(
      user.id,
      apiKey,
      storeName || validation.websiteInfo?.websiteTitle
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
        name: storeName || 'Squarespace Store',
      },
    });

  } catch (error) {
    console.error('Squarespace connect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

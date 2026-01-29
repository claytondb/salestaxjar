/**
 * API Keys Management
 * 
 * GET /api/keys - List user's API keys
 * POST /api/keys - Create new API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateApiKey, listApiKeys } from '@/lib/apikeys';
import { z } from 'zod';

const createKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  permissions: z.enum(['calculate', 'sync', 'full']).optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const keys = await listApiKeys(user.id);
    
    return NextResponse.json({ keys });
  } catch (error) {
    console.error('List API keys error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const parsed = createKeySchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    const { name, permissions } = parsed.data;
    
    const result = await generateApiKey(user.id, name, {
      permissions: permissions || 'calculate',
    });
    
    return NextResponse.json({
      success: true,
      // IMPORTANT: This is the only time the full key is returned
      key: result.key,
      keyId: result.keyId,
      keyPrefix: result.keyPrefix,
      message: 'Save this key securely - it will not be shown again',
    });
  } catch (error) {
    console.error('Create API key error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

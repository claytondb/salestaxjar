/**
 * API Key Management (single key)
 * 
 * DELETE /api/keys/[id] - Delete an API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { deleteApiKey, revokeApiKey } from '@/lib/apikeys';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    
    const deleted = await deleteApiKey(user.id, id);
    
    if (!deleted) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete API key error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    const body = await request.json();
    
    if (body.action === 'revoke') {
      const revoked = await revokeApiKey(user.id, id);
      
      if (!revoked) {
        return NextResponse.json({ error: 'API key not found' }, { status: 404 });
      }
      
      return NextResponse.json({ success: true, message: 'API key revoked' });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Update API key error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

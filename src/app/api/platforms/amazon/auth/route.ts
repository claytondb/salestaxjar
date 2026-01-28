import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAuthorizationUrl, isAmazonConfigured } from '@/lib/platforms/amazon';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

/**
 * GET /api/platforms/amazon/auth
 * 
 * Initiates Amazon Seller Central OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if Amazon is configured
    if (!isAmazonConfigured()) {
      return NextResponse.json(
        { error: 'Amazon integration is not configured' },
        { status: 503 }
      );
    }

    // Generate state for CSRF protection
    const state = uuidv4();
    
    // Store state and user ID in a cookie for verification in callback
    const cookieStore = await cookies();
    cookieStore.set('amazon_oauth_state', JSON.stringify({
      state,
      userId: user.id,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    // Get authorization URL
    const authUrl = getAuthorizationUrl(state);

    // Redirect to Amazon
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Amazon auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

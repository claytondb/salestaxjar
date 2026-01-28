import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAuthorizationUrl, isShopifyConfigured } from '@/lib/platforms/shopify';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

/**
 * GET /api/platforms/shopify/auth
 * 
 * Initiates Shopify OAuth flow
 * Query params:
 *   - shop: The Shopify store domain (e.g., "mystore" or "mystore.myshopify.com")
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

    // Check if Shopify is configured
    if (!isShopifyConfigured()) {
      return NextResponse.json(
        { error: 'Shopify integration is not configured' },
        { status: 503 }
      );
    }

    // Get shop from query params
    const shop = request.nextUrl.searchParams.get('shop');
    if (!shop) {
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      );
    }

    // Generate state for CSRF protection
    const state = uuidv4();
    
    // Store state and user ID in a cookie for verification in callback
    const cookieStore = await cookies();
    cookieStore.set('shopify_oauth_state', JSON.stringify({
      state,
      userId: user.id,
      shop,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    // Get authorization URL
    const authUrl = getAuthorizationUrl(shop, state);

    // Redirect to Shopify
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Shopify auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCodeForToken, saveAmazonConnection } from '@/lib/platforms/amazon';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sails.tax';

/**
 * GET /api/platforms/amazon/callback
 * 
 * Handles Amazon OAuth callback
 * Query params from Amazon:
 *   - spapi_oauth_code: Authorization code
 *   - state: CSRF state parameter
 *   - selling_partner_id: The seller's ID
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const authCode = searchParams.get('spapi_oauth_code');
    const state = searchParams.get('state');
    const sellingPartnerId = searchParams.get('selling_partner_id');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('Amazon OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        `${APP_URL}/settings?tab=platforms&error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    // Validate required parameters
    if (!authCode || !state || !sellingPartnerId) {
      return NextResponse.redirect(
        `${APP_URL}/settings?tab=platforms&error=${encodeURIComponent('Missing required OAuth parameters')}`
      );
    }

    // Verify state from cookie
    const cookieStore = await cookies();
    const oauthStateCookie = cookieStore.get('amazon_oauth_state');
    
    if (!oauthStateCookie) {
      return NextResponse.redirect(
        `${APP_URL}/settings?tab=platforms&error=${encodeURIComponent('OAuth session expired')}`
      );
    }

    let oauthState: { state: string; userId: string };
    try {
      oauthState = JSON.parse(oauthStateCookie.value);
    } catch {
      return NextResponse.redirect(
        `${APP_URL}/settings?tab=platforms&error=${encodeURIComponent('Invalid OAuth session')}`
      );
    }

    // Verify state matches
    if (oauthState.state !== state) {
      return NextResponse.redirect(
        `${APP_URL}/settings?tab=platforms&error=${encodeURIComponent('OAuth state mismatch')}`
      );
    }

    // Clear the OAuth cookie
    cookieStore.delete('amazon_oauth_state');

    // Exchange code for tokens
    const tokenResult = await exchangeCodeForToken(authCode);
    
    if (tokenResult.error || !tokenResult.accessToken || !tokenResult.refreshToken) {
      console.error('Amazon token exchange error:', tokenResult.error);
      return NextResponse.redirect(
        `${APP_URL}/settings?tab=platforms&error=${encodeURIComponent(tokenResult.error || 'Failed to get access token')}`
      );
    }

    // Save the connection
    const saveResult = await saveAmazonConnection(
      oauthState.userId,
      sellingPartnerId,
      tokenResult.accessToken,
      tokenResult.refreshToken
    );

    if (!saveResult.success) {
      console.error('Failed to save Amazon connection:', saveResult.error);
      return NextResponse.redirect(
        `${APP_URL}/settings?tab=platforms&error=${encodeURIComponent(saveResult.error || 'Failed to save connection')}`
      );
    }

    // Success - redirect to settings
    return NextResponse.redirect(
      `${APP_URL}/settings?tab=platforms&success=amazon`
    );
  } catch (error) {
    console.error('Amazon callback error:', error);
    return NextResponse.redirect(
      `${APP_URL}/settings?tab=platforms&error=${encodeURIComponent('An unexpected error occurred')}`
    );
  }
}

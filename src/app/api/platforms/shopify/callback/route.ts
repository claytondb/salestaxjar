import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, saveShopifyConnection } from '@/lib/platforms/shopify';
import { cookies } from 'next/headers';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://salestaxjar.vercel.app';

/**
 * GET /api/platforms/shopify/callback
 * 
 * OAuth callback handler for Shopify
 * Receives authorization code and exchanges it for access token
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const shop = searchParams.get('shop');
    const state = searchParams.get('state');

    // Verify required parameters
    if (!code || !shop || !state) {
      return NextResponse.redirect(
        `${APP_URL}/settings?error=missing_params&tab=platforms`
      );
    }

    // Retrieve and verify state from cookie
    const cookieStore = await cookies();
    const oauthStateCookie = cookieStore.get('shopify_oauth_state');
    
    if (!oauthStateCookie) {
      return NextResponse.redirect(
        `${APP_URL}/settings?error=invalid_state&tab=platforms`
      );
    }

    let oauthData: { state: string; userId: string; shop: string };
    try {
      oauthData = JSON.parse(oauthStateCookie.value);
    } catch {
      return NextResponse.redirect(
        `${APP_URL}/settings?error=invalid_state&tab=platforms`
      );
    }

    // Verify state matches
    if (oauthData.state !== state) {
      return NextResponse.redirect(
        `${APP_URL}/settings?error=state_mismatch&tab=platforms`
      );
    }

    // Clear the OAuth state cookie
    cookieStore.delete('shopify_oauth_state');

    // Exchange code for access token
    const { accessToken, error: tokenError } = await exchangeCodeForToken(shop, code);
    
    if (tokenError || !accessToken) {
      console.error('Shopify token exchange error:', tokenError);
      return NextResponse.redirect(
        `${APP_URL}/settings?error=token_exchange_failed&tab=platforms`
      );
    }

    // Save the connection
    const { success, error: saveError } = await saveShopifyConnection(
      oauthData.userId,
      shop,
      accessToken
    );

    if (!success) {
      console.error('Failed to save Shopify connection:', saveError);
      return NextResponse.redirect(
        `${APP_URL}/settings?error=save_failed&tab=platforms`
      );
    }

    // Success! Redirect back to settings
    return NextResponse.redirect(
      `${APP_URL}/settings?success=shopify_connected&tab=platforms`
    );
  } catch (error) {
    console.error('Shopify callback error:', error);
    return NextResponse.redirect(
      `${APP_URL}/settings?error=callback_failed&tab=platforms`
    );
  }
}

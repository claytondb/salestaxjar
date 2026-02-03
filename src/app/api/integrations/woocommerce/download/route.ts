/**
 * WooCommerce Plugin Download
 * 
 * GET /api/integrations/woocommerce/download
 * 
 * Redirects to the static plugin ZIP file.
 * Requires authentication.
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Redirect to the static ZIP file
    return NextResponse.redirect(new URL('/downloads/sails-tax-for-woocommerce.zip', process.env.NEXT_PUBLIC_BASE_URL || 'https://sails.tax'));
  } catch (error) {
    console.error('Plugin download error:', error);
    return NextResponse.json(
      { error: 'Failed to download plugin' },
      { status: 500 }
    );
  }
}

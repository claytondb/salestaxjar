import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { removeShopifyConnection, isShopifyConfigured } from '@/lib/platforms/shopify';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/integrations/shopify/disconnect
 * 
 * Disconnect a Shopify store
 * Body: { shop: string } - The shop domain to disconnect
 */
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

    const body = await request.json();
    const { shop } = body;

    if (!shop) {
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      );
    }

    // Remove the connection
    const result = await removeShopifyConnection(user.id, shop);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to disconnect' },
        { status: 400 }
      );
    }

    // Optionally: Clean up related imported orders
    // This is optional - you might want to keep historical data
    // await prisma.importedOrder.deleteMany({
    //   where: {
    //     userId: user.id,
    //     platform: 'shopify',
    //     // Match orders from this specific shop if needed
    //   },
    // });

    return NextResponse.json({
      success: true,
      message: `Disconnected from ${shop}`,
    });
  } catch (error) {
    console.error('Shopify disconnect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

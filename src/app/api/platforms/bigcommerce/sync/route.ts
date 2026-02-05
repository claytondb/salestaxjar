/**
 * BigCommerce Order Sync API
 * 
 * POST /api/platforms/bigcommerce/sync
 * 
 * Fetches orders from BigCommerce and imports them to the database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  getCredentials, 
  fetchAllOrders,
  fetchOrderShippingAddresses,
  mapOrderToImport 
} from '@/lib/platforms/bigcommerce';
import { saveImportedOrders, updateSyncStatus } from '@/lib/platforms';
import { userCanConnectPlatform, tierGateError } from '@/lib/plans';
import { z } from 'zod';

const syncSchema = z.object({
  platformId: z.string().min(1, 'Platform ID (Store Hash) is required'),
  daysBack: z.number().optional().default(30),
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

    // Tier gate: BigCommerce requires Pro or higher
    const access = userCanConnectPlatform(user, 'bigcommerce');
    if (!access.allowed) {
      return NextResponse.json(
        tierGateError(access.userPlan, access.requiredPlan, 'platform_bigcommerce'),
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const parsed = syncSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { platformId, daysBack } = parsed.data;

    // Get credentials from database
    const credentials = await getCredentials(user.id, platformId);
    if (!credentials) {
      return NextResponse.json(
        { error: 'BigCommerce connection not found' },
        { status: 404 }
      );
    }

    // Get connection ID
    const connection = await prisma.platformConnection.findUnique({
      where: {
        userId_platform_platformId: {
          userId: user.id,
          platform: 'bigcommerce',
          platformId,
        },
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Update sync status to syncing
    await updateSyncStatus(user.id, 'bigcommerce', platformId, 'syncing');

    try {
      // Calculate date range
      const now = new Date();
      const afterDate = new Date();
      afterDate.setDate(afterDate.getDate() - daysBack);

      // Fetch orders from BigCommerce
      const bigCommerceOrders = await fetchAllOrders(credentials, {
        minDateCreated: afterDate.toISOString(),
        maxDateCreated: now.toISOString(),
      });

      // Filter out cancelled and refunded orders
      const validOrders = bigCommerceOrders.filter(
        order => ![4, 5, 6].includes(order.status_id) // Exclude refunded, cancelled, declined
      );

      // Map orders to our format
      // For better accuracy, we fetch shipping addresses for each order
      const importedOrders = await Promise.all(
        validOrders.map(async (order) => {
          try {
            // Try to get shipping address
            const shippingAddresses = await fetchOrderShippingAddresses(
              credentials,
              order.id
            );
            const shippingAddress = shippingAddresses[0]; // Use first shipping address
            return mapOrderToImport(order, shippingAddress);
          } catch {
            // If shipping address fetch fails, use billing address
            return mapOrderToImport(order);
          }
        })
      );

      // Save to database
      const result = await saveImportedOrders(
        user.id,
        connection.id,
        importedOrders
      );

      // Update sync status to success
      await updateSyncStatus(user.id, 'bigcommerce', platformId, 'success');

      // Get unique states
      const stateSet = new Set(importedOrders.map(o => o.shippingState).filter(Boolean));

      return NextResponse.json({
        success: true,
        imported: result.imported,
        errors: result.errors,
        totalOrders: bigCommerceOrders.length,
        validOrders: validOrders.length,
        dateRange: {
          from: afterDate.toISOString(),
          to: now.toISOString(),
        },
        statesFound: Array.from(stateSet),
      });

    } catch (syncError) {
      // Update sync status to error
      const errorMessage = syncError instanceof Error ? syncError.message : 'Sync failed';
      await updateSyncStatus(user.id, 'bigcommerce', platformId, 'error', errorMessage);
      
      throw syncError;
    }

  } catch (error) {
    console.error('BigCommerce sync error:', error);
    return NextResponse.json(
      { 
        error: 'Sync failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

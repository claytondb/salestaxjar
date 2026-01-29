/**
 * Squarespace Order Sync API
 * 
 * POST /api/platforms/squarespace/sync
 * 
 * Fetches orders from Squarespace and imports them to the database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  getCredentials, 
  fetchAllOrders, 
  mapOrderToImport 
} from '@/lib/platforms/squarespace';
import { saveImportedOrders, updateSyncStatus } from '@/lib/platforms';
import { z } from 'zod';

const syncSchema = z.object({
  platformId: z.string().min(1, 'Platform ID is required'),
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

    // Get API key from database
    const apiKey = await getCredentials(user.id, platformId);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Squarespace connection not found' },
        { status: 404 }
      );
    }

    // Get connection ID
    const connection = await prisma.platformConnection.findUnique({
      where: {
        userId_platform_platformId: {
          userId: user.id,
          platform: 'squarespace',
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
    await updateSyncStatus(user.id, 'squarespace', platformId, 'syncing');

    try {
      // Calculate date range
      const now = new Date();
      const afterDate = new Date();
      afterDate.setDate(afterDate.getDate() - daysBack);

      // Fetch orders from Squarespace
      const squarespaceOrders = await fetchAllOrders(apiKey, {
        modifiedAfter: afterDate.toISOString(),
        modifiedBefore: now.toISOString(),
      });

      // Filter out test orders and cancelled orders
      const validOrders = squarespaceOrders.filter(
        order => !order.testmode && order.fulfillmentStatus !== 'CANCELED'
      );

      // Map to our format
      const importedOrders = validOrders.map(order => mapOrderToImport(order));

      // Save to database
      const result = await saveImportedOrders(
        user.id,
        connection.id,
        importedOrders
      );

      // Update sync status to success
      await updateSyncStatus(user.id, 'squarespace', platformId, 'success');

      // Get unique states
      const stateSet = new Set(importedOrders.map(o => o.shippingState).filter(Boolean));

      return NextResponse.json({
        success: true,
        imported: result.imported,
        errors: result.errors,
        totalOrders: squarespaceOrders.length,
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
      await updateSyncStatus(user.id, 'squarespace', platformId, 'error', errorMessage);
      
      throw syncError;
    }

  } catch (error) {
    console.error('Squarespace sync error:', error);
    return NextResponse.json(
      { 
        error: 'Sync failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

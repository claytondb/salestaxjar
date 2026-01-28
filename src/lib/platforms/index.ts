/**
 * Platform Integrations - Unified Export
 * 
 * Central module for all e-commerce platform integrations
 */

import { prisma } from '../prisma';

// Re-export platform modules with namespaces to avoid conflicts
export * as shopify from './shopify';
export * as amazon from './amazon';
export * as etsy from './etsy';

// Export commonly used functions with platform prefix
export { isShopifyConfigured, saveShopifyConnection, removeShopifyConnection, fetchOrders as fetchShopifyOrders } from './shopify';
export { isAmazonConfigured, saveAmazonConnection, removeAmazonConnection, fetchOrders as fetchAmazonOrders } from './amazon';
export { isEtsyConfigured, saveEtsyConnection, fetchReceipts as fetchEtsyReceipts } from './etsy';

// Platform configuration status
export interface PlatformConfig {
  platform: string;
  name: string;
  configured: boolean;
  description: string;
  features: string[];
  setupUrl?: string;
}

/**
 * Get configuration status for all platforms
 */
export function getPlatformConfigurations(): PlatformConfig[] {
  return [
    {
      platform: 'shopify',
      name: 'Shopify',
      configured: !!(process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET),
      description: 'Connect your Shopify store to automatically import orders and calculate sales tax.',
      features: ['Order sync', 'Product categories', 'Location-based nexus', 'Real-time calculations'],
      setupUrl: 'https://partners.shopify.com',
    },
    {
      platform: 'amazon',
      name: 'Amazon Seller Central',
      configured: true, // Manual import always available
      description: 'Import your Amazon tax reports to track sales and tax obligations. Direct API integration coming soon!',
      features: ['CSV import', 'Tax reports', 'Multi-marketplace', 'FBA support'],
    },
    {
      platform: 'etsy',
      name: 'Etsy',
      configured: !!(process.env.ETSY_API_KEY && process.env.ETSY_API_SECRET),
      description: 'Import your Etsy shop sales for comprehensive tax tracking.',
      features: ['Receipt sync', 'Transaction details', 'Shipping tracking'],
      setupUrl: 'https://www.etsy.com/developers',
    },
    {
      platform: 'woocommerce',
      name: 'WooCommerce',
      configured: false, // WooCommerce uses REST API keys per store
      description: 'Connect your WooCommerce store using REST API keys.',
      features: ['Order sync', 'Product tax classes', 'Webhook support'],
    },
    {
      platform: 'bigcommerce',
      name: 'BigCommerce',
      configured: !!(process.env.BIGCOMMERCE_CLIENT_ID && process.env.BIGCOMMERCE_CLIENT_SECRET),
      description: 'Integrate your BigCommerce store for automated tax compliance.',
      features: ['Order import', 'Customer data', 'Tax settings sync'],
    },
    {
      platform: 'ebay',
      name: 'eBay',
      configured: !!(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET),
      description: 'Track your eBay sales and tax obligations.',
      features: ['Order sync', 'Managed payments', 'Multi-account support'],
    },
    {
      platform: 'square',
      name: 'Square',
      configured: !!(process.env.SQUARE_APPLICATION_ID && process.env.SQUARE_ACCESS_TOKEN),
      description: 'Connect Square for POS and online sales tracking.',
      features: ['Transaction sync', 'Location tracking', 'Item categories'],
    },
  ];
}

/**
 * Check if any platform is configured
 */
export function hasAnyPlatformConfigured(): boolean {
  return getPlatformConfigurations().some(p => p.configured);
}

// =============================================================================
// Connection Management
// =============================================================================

export interface PlatformConnectionInfo {
  id: string;
  platform: string;
  platformId: string;
  platformName: string | null;
  connected: boolean;
  lastSyncAt: Date | null;
  syncStatus: string;
  syncError: string | null;
}

/**
 * Get all platform connections for a user
 */
export async function getUserConnections(userId: string): Promise<PlatformConnectionInfo[]> {
  const connections = await prisma.platformConnection.findMany({
    where: { userId },
    select: {
      id: true,
      platform: true,
      platformId: true,
      platformName: true,
      lastSyncAt: true,
      syncStatus: true,
      syncError: true,
    },
  });

  return connections.map(c => ({
    ...c,
    connected: true,
  }));
}

/**
 * Get connection by platform type
 */
export async function getConnection(
  userId: string,
  platform: string,
  platformId?: string
) {
  if (platformId) {
    return prisma.platformConnection.findUnique({
      where: {
        userId_platform_platformId: {
          userId,
          platform,
          platformId,
        },
      },
    });
  }
  
  // Get first connection for this platform
  return prisma.platformConnection.findFirst({
    where: { userId, platform },
  });
}

/**
 * Delete a platform connection
 */
export async function deleteConnection(
  userId: string,
  platform: string,
  platformId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.platformConnection.delete({
      where: {
        userId_platform_platformId: {
          userId,
          platform,
          platformId,
        },
      },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete connection' };
  }
}

/**
 * Update sync status for a connection
 */
export async function updateSyncStatus(
  userId: string,
  platform: string,
  platformId: string,
  status: 'syncing' | 'success' | 'error',
  error?: string
): Promise<void> {
  await prisma.platformConnection.update({
    where: {
      userId_platform_platformId: {
        userId,
        platform,
        platformId,
      },
    },
    data: {
      syncStatus: status,
      syncError: error || null,
      lastSyncAt: status === 'success' ? new Date() : undefined,
    },
  });
}

// =============================================================================
// Order Import
// =============================================================================

export interface ImportedOrderData {
  platform: string;
  platformOrderId: string;
  orderNumber?: string;
  orderDate: Date;
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: string;
  customerEmail?: string;
  shippingState?: string;
  shippingCity?: string;
  shippingZip?: string;
  shippingCountry: string;
  billingState?: string;
  lineItems?: object[];
  taxBreakdown?: object;
  rawData?: object;
}

/**
 * Save imported orders to database
 */
export async function saveImportedOrders(
  userId: string,
  platformConnectionId: string,
  orders: ImportedOrderData[]
): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;

  for (const order of orders) {
    try {
      await prisma.importedOrder.upsert({
        where: {
          platform_platformOrderId: {
            platform: order.platform,
            platformOrderId: order.platformOrderId,
          },
        },
        create: {
          userId,
          platformConnectionId,
          platform: order.platform,
          platformOrderId: order.platformOrderId,
          orderNumber: order.orderNumber,
          orderDate: order.orderDate,
          subtotal: order.subtotal,
          shippingAmount: order.shippingAmount,
          taxAmount: order.taxAmount,
          totalAmount: order.totalAmount,
          currency: order.currency,
          status: order.status,
          customerEmail: order.customerEmail,
          shippingState: order.shippingState,
          shippingCity: order.shippingCity,
          shippingZip: order.shippingZip,
          shippingCountry: order.shippingCountry,
          billingState: order.billingState,
          lineItems: order.lineItems ? JSON.stringify(order.lineItems) : null,
          taxBreakdown: order.taxBreakdown ? JSON.stringify(order.taxBreakdown) : null,
          rawData: order.rawData ? JSON.stringify(order.rawData) : null,
        },
        update: {
          orderNumber: order.orderNumber,
          subtotal: order.subtotal,
          shippingAmount: order.shippingAmount,
          taxAmount: order.taxAmount,
          totalAmount: order.totalAmount,
          status: order.status,
          lineItems: order.lineItems ? JSON.stringify(order.lineItems) : null,
          taxBreakdown: order.taxBreakdown ? JSON.stringify(order.taxBreakdown) : null,
          rawData: order.rawData ? JSON.stringify(order.rawData) : null,
          updatedAt: new Date(),
        },
      });
      imported++;
    } catch (error) {
      errors.push(`Order ${order.platformOrderId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { imported, errors };
}

/**
 * Update sales summary from imported orders
 */
export async function updateSalesSummary(
  userId: string,
  stateCode: string,
  period: string // YYYY-MM format
): Promise<void> {
  // Calculate aggregates from imported orders
  const periodStart = new Date(`${period}-01`);
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const aggregates = await prisma.importedOrder.aggregate({
    where: {
      userId,
      shippingState: stateCode,
      orderDate: {
        gte: periodStart,
        lt: periodEnd,
      },
      status: {
        notIn: ['cancelled', 'refunded'],
      },
    },
    _sum: {
      subtotal: true,
      taxAmount: true,
      totalAmount: true,
    },
    _count: true,
  });

  // Get unique platforms
  const platforms = await prisma.importedOrder.findMany({
    where: {
      userId,
      shippingState: stateCode,
      orderDate: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
    select: { platform: true },
    distinct: ['platform'],
  });

  // Update or create summary
  await prisma.salesSummary.upsert({
    where: {
      userId_stateCode_period: {
        userId,
        stateCode,
        period,
      },
    },
    create: {
      userId,
      stateCode,
      period,
      totalSales: aggregates._sum.totalAmount || 0,
      taxableSales: aggregates._sum.subtotal || 0,
      taxCollected: aggregates._sum.taxAmount || 0,
      orderCount: aggregates._count,
      platforms: JSON.stringify(platforms.map(p => p.platform)),
    },
    update: {
      totalSales: aggregates._sum.totalAmount || 0,
      taxableSales: aggregates._sum.subtotal || 0,
      taxCollected: aggregates._sum.taxAmount || 0,
      orderCount: aggregates._count,
      platforms: JSON.stringify(platforms.map(p => p.platform)),
      updatedAt: new Date(),
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveUserPlan, getPlanDisplayName, PLAN_ORDER_LIMITS } from '@/lib/plans';
import { applyMonthlyOrderCap, freeUserImportError } from '@/lib/usage';
import { saveImportedOrders, type ImportedOrderData } from '@/lib/platforms';
import { checkAndCreateAlerts } from '@/lib/nexus-alerts';
import { checkApiRateLimit, rateLimitHeaders } from '@/lib/ratelimit';
import { isUsStateCode } from '@/lib/us-states';
import {
  FILE_IMPORT_CONNECTION_ID,
  FILE_IMPORT_PLATFORMS,
  IMPORT_BATCH_SIZE,
  type FileImportPlatform,
} from '@/lib/order-file-import';

export const maxDuration = 60;

const EARLIEST = Date.UTC(2015, 0, 1);

const batchSchema = z.object({
  platform: z.enum(FILE_IMPORT_PLATFORMS),
  orders: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(120),
        number: z.string().trim().max(120).optional(),
        date: z.string().datetime({ offset: true }),
        state: z.string().length(2),
        sales: z.number().finite().min(0).max(10_000_000),
        tax: z.number().finite().min(0).max(10_000_000).default(0),
      })
    )
    .min(1)
    .max(IMPORT_BATCH_SIZE),
  /** Set on the last batch: check thresholds and create alerts once, at the end */
  final: z.boolean().optional(),
});

/** Channel twins: moving a generic file between own store and marketplace moves its orders. */
const OTHER_UPLOAD: Partial<Record<FileImportPlatform, FileImportPlatform>> = {
  upload: 'upload-marketplace',
  'upload-marketplace': 'upload',
};

/**
 * POST /api/orders/import
 *
 * Save a batch of orders read from an order export in the browser. The file
 * itself never reaches the server — only id, date, ship-to state, sales and
 * tax for each order. Orders are upserted, so importing the same file twice
 * (or a file that overlaps a store sync) doesn't double-count.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = await checkApiRateLimit(`order-import:${user.id}`);
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a minute and try again.' },
      { status: 429, headers: rateLimitHeaders(rate) }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid orders' }, { status: 400 });
  }
  const { platform, orders, final } = parsed.data;

  const plan = resolveUserPlan(user.subscription);
  if (PLAN_ORDER_LIMITS[plan] === 0) {
    return NextResponse.json(freeUserImportError(), { status: 403 });
  }

  // Keep only orders Sails can use: a US state and a believable date
  const latest = Date.now() + 2 * 86_400_000;
  let rejected = 0;
  const rows: ImportedOrderData[] = [];
  for (const o of orders) {
    const date = new Date(o.date);
    const state = o.state.toUpperCase();
    if (!isUsStateCode(state) || date.getTime() < EARLIEST || date.getTime() > latest) {
      rejected++;
      continue;
    }
    rows.push({
      platform,
      platformOrderId: o.id,
      orderNumber: o.number || o.id,
      orderDate: date,
      subtotal: o.sales,
      shippingAmount: 0,
      taxAmount: o.tax,
      totalAmount: Math.round((o.sales + o.tax) * 100) / 100,
      currency: 'USD',
      status: 'imported',
      shippingState: state,
      shippingCountry: 'US',
    });
  }

  try {
    // The plan's monthly order limit applies to imports just as to store syncs
    const capped = await applyMonthlyOrderCap({
      userId: user.id,
      subscription: user.subscription,
      platform,
      items: rows,
      getOrderDate: (o) => o.orderDate,
      getPlatformOrderId: (o) => o.platformOrderId,
    });

    // A generic file re-imported under the other channel replaces its earlier copy
    const twin = OTHER_UPLOAD[platform];
    if (twin && capped.items.length > 0) {
      await prisma.importedOrder.deleteMany({
        where: {
          userId: user.id,
          platform: twin,
          platformConnectionId: FILE_IMPORT_CONNECTION_ID,
          platformOrderId: { in: capped.items.map((o) => o.platformOrderId) },
        },
      });
    }

    const { imported, errors } = await saveImportedOrders(user.id, FILE_IMPORT_CONNECTION_ID, capped.items);

    let newAlerts = 0;
    if (final) {
      try {
        newAlerts = (await checkAndCreateAlerts(user.id)).length;
      } catch (alertError) {
        console.error('Order import: alert check failed', alertError);
      }
    }

    return NextResponse.json({
      imported,
      rejected,
      failed: errors.length,
      skippedOverLimit: capped.skipped,
      monthlyLimit: capped.limit,
      newAlerts: newAlerts > 0 ? newAlerts : undefined,
    });
  } catch (error) {
    console.error('Order import error:', error);
    return NextResponse.json({ error: 'Import failed. Please try again.' }, { status: 500 });
  }
}

/**
 * GET /api/orders/import
 *
 * What has been imported from files so far, by where it's stored, and the
 * plan's monthly order limit (so the import screen can say what won't count).
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const groups = await prisma.importedOrder.groupBy({
    by: ['platform'],
    where: { userId: user.id, platformConnectionId: FILE_IMPORT_CONNECTION_ID },
    _count: { _all: true },
    _min: { orderDate: true },
    _max: { orderDate: true, updatedAt: true },
  });
  const plan = resolveUserPlan(user.subscription);
  return NextResponse.json({
    monthlyLimit: PLAN_ORDER_LIMITS[plan],
    planName: getPlanDisplayName(plan),
    imports: groups.map((g) => ({
      platform: g.platform,
      orders: g._count._all,
      from: g._min.orderDate?.toISOString() ?? null,
      to: g._max.orderDate?.toISOString() ?? null,
      lastImported: g._max.updatedAt?.toISOString() ?? null,
    })),
  });
}

/**
 * DELETE /api/orders/import?platform=shopify
 *
 * Remove the orders imported from files for one source (e.g. the wrong file
 * was imported). Orders from store syncs are never touched.
 */
export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const platform = new URL(request.url).searchParams.get('platform');
  if (!platform || !(FILE_IMPORT_PLATFORMS as readonly string[]).includes(platform)) {
    return NextResponse.json({ error: 'Unknown import' }, { status: 400 });
  }
  const result = await prisma.importedOrder.deleteMany({
    where: { userId: user.id, platform, platformConnectionId: FILE_IMPORT_CONNECTION_ID },
  });
  return NextResponse.json({ removed: result.count });
}

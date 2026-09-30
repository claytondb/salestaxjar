import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EXCLUDED_ORDER_STATUSES, channelForPlatform, type SalesChannel } from '@/lib/nexus-engine';
import { US_COUNTRY_VALUES } from '@/lib/nexus-data';
import { toCountryCode } from '@/lib/us-states';
import { buildFilingWorksheet, worksheetCsv, worksheetRange, type WorksheetRow } from '@/lib/filing-worksheet';

/** Most orders a CSV download will include (a small seller's quarter in one state is far below this). */
const CSV_ORDER_LIMIT = 50_000;

/**
 * GET /api/filings/:id/worksheet
 *
 * The numbers for one return: sales, shipping and tax collected in the
 * filing's state and period, split into own-store and marketplace orders,
 * plus anything to check first. `?format=csv` downloads the orders instead.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const filing = await prisma.filing.findFirst({
    where: { id, business: { userId: user.id } },
    select: { stateCode: true, stateName: true, period: true, periodStart: true, periodEnd: true },
  });
  if (!filing) {
    return NextResponse.json({ error: 'Filing not found' }, { status: 404 });
  }

  const { start, endExclusive } = worksheetRange(filing);
  const excluded = Prisma.join(EXCLUDED_ORDER_STATUSES);

  try {
    if (new URL(request.url).searchParams.get('format') === 'csv') {
      const orders = await prisma.importedOrder.findMany({
        where: {
          userId: user.id,
          orderDate: { gte: start, lt: endExclusive },
          status: { notIn: EXCLUDED_ORDER_STATUSES },
          shippingState: { not: null },
        },
        select: {
          orderDate: true,
          orderNumber: true,
          platformOrderId: true,
          platform: true,
          shippingState: true,
          shippingCity: true,
          shippingZip: true,
          shippingCountry: true,
          totalAmount: true,
          taxAmount: true,
          shippingAmount: true,
        },
        orderBy: { orderDate: 'asc' },
        take: CSV_ORDER_LIMIT,
      });
      const csv = worksheetCsv(
        filing,
        orders
          .filter((o) => toCountryCode(o.shippingCountry) === 'US')
          .map((o) => ({
            ...o,
            totalAmount: Number(o.totalAmount),
            taxAmount: Number(o.taxAmount),
            shippingAmount: Number(o.shippingAmount),
          }))
      );
      const name = `sails-${filing.stateCode.toLowerCase()}-${start.toISOString().slice(0, 10)}-to-${filing.periodEnd
        .toISOString()
        .slice(0, 10)}.csv`;
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${name}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const usValues = Prisma.join(US_COUNTRY_VALUES);
    const [rows, latestRows] = await Promise.all([
      prisma.$queryRaw<WorksheetRow[]>`
        SELECT "shippingState" AS state,
               platform,
               COUNT(*)::int AS orders,
               COALESCE(SUM("totalAmount" - "taxAmount"), 0)::float8 AS sales,
               COALESCE(SUM("shippingAmount"), 0)::float8 AS shipping,
               COALESCE(SUM("taxAmount"), 0)::float8 AS tax
        FROM "ImportedOrder"
        WHERE "userId" = ${user.id}
          AND upper(trim("shippingCountry")) IN (${usValues})
          AND "shippingState" IS NOT NULL
          AND "status" NOT IN (${excluded})
          AND "orderDate" >= ${start}
          AND "orderDate" < ${endExclusive}
        GROUP BY 1, 2`,
      prisma.$queryRaw<{ platform: string; latest: Date | null }[]>`
        SELECT platform, MAX("orderDate") AS latest
        FROM "ImportedOrder"
        WHERE "userId" = ${user.id}
          AND "status" NOT IN (${excluded})
        GROUP BY 1`,
    ]);

    const latest: Partial<Record<SalesChannel, Date | null>> = {};
    for (const row of latestRows) {
      if (!row.latest) continue;
      const channel = channelForPlatform(row.platform);
      const date = new Date(row.latest);
      const current = latest[channel];
      if (!current || date > current) latest[channel] = date;
    }

    return NextResponse.json({ worksheet: buildFilingWorksheet(filing, rows, latest) });
  } catch (error) {
    console.error('Filing worksheet error:', error);
    return NextResponse.json({ error: 'Could not prepare this return. Please try again.' }, { status: 500 });
  }
}

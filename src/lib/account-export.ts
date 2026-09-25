/**
 * Builds the account data export (GET /api/account/export) as a stream of
 * JSON text chunks. Orders and calculations are read a page at a time so the
 * export never has to hold a whole order history in memory.
 */

import { prisma } from './prisma';

/** Rows fetched per database round trip for the large collections. */
export const EXPORT_PAGE_SIZE = 1000;

type DecimalLike = { toString(): string } | number | null | undefined;

function num(value: DecimalLike): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : null;
}

const ORDER_SELECT = {
  id: true,
  platform: true,
  platformOrderId: true,
  orderNumber: true,
  orderDate: true,
  subtotal: true,
  shippingAmount: true,
  taxAmount: true,
  totalAmount: true,
  currency: true,
  status: true,
  shippingCity: true,
  shippingState: true,
  shippingZip: true,
  shippingCountry: true,
} as const;

/** Page through a collection with a stable cursor (newest first). */
async function* paged<T extends { id: string }>(
  fetchPage: (cursor: string | undefined) => Promise<T[]>
): AsyncGenerator<T> {
  let cursor: string | undefined;
  for (;;) {
    const rows = await fetchPage(cursor);
    for (const row of rows) yield row;
    if (rows.length < EXPORT_PAGE_SIZE) return;
    cursor = rows[rows.length - 1].id;
  }
}

function pageArgs(cursor: string | undefined) {
  return {
    take: EXPORT_PAGE_SIZE,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  };
}

/** Writes `"key": [ ...items ]`, one item per line. */
async function* jsonArray<T>(key: string, items: AsyncIterable<T>, map: (item: T) => unknown): AsyncGenerator<string> {
  yield `  ${JSON.stringify(key)}: [`;
  let first = true;
  for await (const item of items) {
    yield `${first ? '\n' : ',\n'}    ${JSON.stringify(map(item))}`;
    first = false;
  }
  yield first ? ']' : '\n  ]';
}

export async function* exportChunks(userId: string): AsyncGenerator<string> {
  // Small collections: read in one go.
  const [account, businesses, connections, alerts, prefs, apiKeys] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
        subscription: { select: { plan: true, status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true } },
      },
    }),
    prisma.business.findMany({
      where: { userId },
      include: { nexusStates: true, filings: true },
    }),
    prisma.platformConnection.findMany({
      where: { userId },
      select: { platform: true, platformId: true, platformName: true, lastSyncAt: true, syncStatus: true, createdAt: true },
    }),
    prisma.nexusAlert.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.notificationPreference.findUnique({ where: { userId } }),
    prisma.apiKey.findMany({
      where: { userId },
      select: { name: true, keyPrefix: true, permissions: true, isActive: true, lastUsedAt: true, createdAt: true },
    }),
  ]);

  const head = {
    exportedAt: new Date().toISOString(),
    format: 'sails-account-export/v1',
    account,
    businesses: businesses.map((b) => ({
      name: b.name,
      address: b.address,
      city: b.city,
      state: b.state,
      zip: b.zip,
      businessType: b.businessType,
      ein: b.ein,
      createdAt: b.createdAt,
      nexusStates: b.nexusStates.map((n) => ({
        stateCode: n.stateCode,
        hasNexus: n.hasNexus,
        nexusType: n.nexusType,
        registrationNumber: n.registrationNumber,
        registrationDate: n.registrationDate,
      })),
      filings: b.filings.map((f) => ({
        stateCode: f.stateCode,
        period: f.period,
        periodStart: f.periodStart,
        periodEnd: f.periodEnd,
        dueDate: f.dueDate,
        status: f.status,
        estimatedTax: num(f.estimatedTax),
        actualTax: num(f.actualTax),
        filedAt: f.filedAt,
        confirmationNumber: f.confirmationNumber,
        notes: f.notes,
      })),
    })),
    storeConnections: connections,
    nexusAlerts: alerts.map((a) => ({
      stateCode: a.stateCode,
      alertLevel: a.alertLevel,
      salesAmount: num(a.salesAmount),
      threshold: num(a.threshold),
      percentage: num(a.percentage),
      message: a.message,
      createdAt: a.createdAt,
    })),
    notificationPreferences: prefs
      ? {
          emailDeadlineReminders: prefs.emailDeadlineReminders,
          emailWeeklyDigest: prefs.emailWeeklyDigest,
          emailNexusAlerts: prefs.emailNexusAlerts,
          emailNewRates: prefs.emailNewRates,
          reminderDaysBefore: prefs.reminderDaysBefore,
        }
      : null,
    apiKeys,
  };

  // Open the object and write the small fields (without the closing brace).
  const headJson = JSON.stringify(head, null, 2);
  yield headJson.slice(0, headJson.lastIndexOf('}')).trimEnd();
  yield ',\n';

  // Large collections: streamed a page at a time.
  const calculations = paged((cursor) =>
    prisma.calculation.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...pageArgs(cursor),
    })
  );
  yield* jsonArray('calculations', calculations, (c) => ({
    amount: num(c.amount),
    stateCode: c.stateCode,
    category: c.category,
    taxRate: num(c.taxRate),
    taxAmount: num(c.taxAmount),
    total: num(c.total),
    source: c.source,
    createdAt: c.createdAt,
  }));
  yield ',\n';

  const orders = paged((cursor) =>
    prisma.importedOrder.findMany({
      where: { userId },
      orderBy: [{ orderDate: 'desc' }, { id: 'desc' }],
      select: ORDER_SELECT,
      ...pageArgs(cursor),
    })
  );
  yield* jsonArray('importedOrders', orders, ({ id: _id, ...o }) => ({
    ...o,
    subtotal: num(o.subtotal),
    shippingAmount: num(o.shippingAmount),
    taxAmount: num(o.taxAmount),
    totalAmount: num(o.totalAmount),
  }));
  yield '\n}\n';
}

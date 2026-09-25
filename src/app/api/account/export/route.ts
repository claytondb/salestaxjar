/**
 * GET /api/account/export
 *
 * Download everything Sails stores about the signed-in user as JSON
 * (the "right to portability" promised in the Privacy Policy).
 * Secrets are never included: no password hash, no store credentials,
 * no API key hashes, no session tokens.
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkApiRateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

type DecimalLike = { toString(): string } | number | null | undefined;

function num(value: DecimalLike): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : null;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = await checkApiRateLimit(`account-export:${user.id}`);
  if (!rate.success) {
    return NextResponse.json({ error: 'Too many export requests. Please try again later.' }, { status: 429 });
  }

  const [account, businesses, calculations, connections, orders, alerts, prefs, apiKeys] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
        subscription: { select: { plan: true, status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true } },
      },
    }),
    prisma.business.findMany({
      where: { userId: user.id },
      include: { nexusStates: true, filings: true },
    }),
    prisma.calculation.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
    prisma.platformConnection.findMany({
      where: { userId: user.id },
      select: { platform: true, platformId: true, platformName: true, lastSyncAt: true, syncStatus: true, createdAt: true },
    }),
    prisma.importedOrder.findMany({
      where: { userId: user.id },
      orderBy: { orderDate: 'desc' },
      select: {
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
      },
    }),
    prisma.nexusAlert.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
    prisma.notificationPreference.findUnique({ where: { userId: user.id } }),
    prisma.apiKey.findMany({
      where: { userId: user.id },
      select: { name: true, keyPrefix: true, permissions: true, isActive: true, lastUsedAt: true, createdAt: true },
    }),
  ]);

  const exportData = {
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
    calculations: calculations.map((c) => ({
      amount: num(c.amount),
      stateCode: c.stateCode,
      category: c.category,
      taxRate: num(c.taxRate),
      taxAmount: num(c.taxAmount),
      total: num(c.total),
      source: c.source,
      createdAt: c.createdAt,
    })),
    storeConnections: connections,
    importedOrders: orders.map((o) => ({
      ...o,
      subtotal: num(o.subtotal),
      shippingAmount: num(o.shippingAmount),
      taxAmount: num(o.taxAmount),
      totalAmount: num(o.totalAmount),
    })),
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

  const filename = `sails-data-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

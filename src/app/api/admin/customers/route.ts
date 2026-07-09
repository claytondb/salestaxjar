import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'david@sails.tax,claytondb@gmail.com')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (email must match AND be verified)
    if (!ADMIN_EMAILS.includes(user.email.toLowerCase()) || !user.emailVerified) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all users with their subscriptions, plus platform connections and
    // imported-order counts (there is no Prisma back-relation on User for these,
    // so we query them separately and join in memory).
    const [customers, connections, orderCounts] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          emailVerified: true,
          subscription: {
            select: {
              plan: true,
              status: true,
              currentPeriodEnd: true,
              cancelAtPeriodEnd: true,
            },
          },
          _count: {
            select: {
              calculations: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.platformConnection.findMany({
        select: { userId: true, platform: true, platformName: true, lastSyncAt: true },
      }),
      prisma.importedOrder.groupBy({ by: ['userId'], _count: { _all: true } }),
    ]);

    type PlatformSummary = { platform: string; name: string | null; lastSync: string | null };
    const platformsByUser = new Map<string, PlatformSummary[]>();
    for (const conn of connections) {
      const list = platformsByUser.get(conn.userId) ?? [];
      list.push({
        platform: conn.platform,
        name: conn.platformName ?? null,
        lastSync: conn.lastSyncAt?.toISOString() ?? null,
      });
      platformsByUser.set(conn.userId, list);
    }
    const ordersByUser = new Map<string, number>(
      orderCounts.map(o => [o.userId, o._count._all])
    );

    // Normalize plan name for reporting: legacy 'business' is the old name for
    // the top tier ('enterprise').
    const normalizePlan = (plan?: string | null) =>
      plan === 'business' ? 'enterprise' : (plan || 'free');

    // Calculate stats
    const stats = {
      totalCustomers: customers.length,
      verifiedCustomers: customers.filter(c => c.emailVerified).length,
      paidCustomers: customers.filter(c => c.subscription?.status === 'active').length,
      planBreakdown: {
        free: customers.filter(c => normalizePlan(c.subscription?.plan) === 'free').length,
        starter: customers.filter(c => normalizePlan(c.subscription?.plan) === 'starter').length,
        pro: customers.filter(c => normalizePlan(c.subscription?.plan) === 'pro').length,
        enterprise: customers.filter(c => normalizePlan(c.subscription?.plan) === 'enterprise').length,
      },
    };

    return NextResponse.json({
      customers: customers.map(c => ({
        id: c.id,
        email: c.email,
        name: c.name,
        createdAt: c.createdAt.toISOString(),
        emailVerified: c.emailVerified,
        plan: normalizePlan(c.subscription?.plan),
        subscriptionStatus: c.subscription?.status || null,
        renewsAt: c.subscription?.currentPeriodEnd?.toISOString() || null,
        cancelAtPeriodEnd: c.subscription?.cancelAtPeriodEnd || false,
        calculationCount: c._count.calculations,
        platforms: platformsByUser.get(c.id) ?? [],
        transactionCount: ordersByUser.get(c.id) ?? 0,
        daysSinceSignup: Math.floor((Date.now() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      })),
      stats,
    });
  } catch (error) {
    console.error('Admin customers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

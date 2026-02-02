import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'david@sails.tax,claytondb@gmail.com').split(',');

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all users with their subscriptions and platform connections
    const customers = await prisma.user.findMany({
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
        platformConnections: {
          select: {
            platform: true,
            platformName: true,
            connected: true,
            lastSyncAt: true,
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
    });

    // Calculate stats
    const stats = {
      totalCustomers: customers.length,
      verifiedCustomers: customers.filter(c => c.emailVerified).length,
      paidCustomers: customers.filter(c => c.subscription?.status === 'active').length,
      planBreakdown: {
        free: customers.filter(c => !c.subscription || c.subscription.plan === 'free').length,
        starter: customers.filter(c => c.subscription?.plan === 'starter').length,
        pro: customers.filter(c => c.subscription?.plan === 'pro').length,
        business: customers.filter(c => c.subscription?.plan === 'business').length,
      },
    };

    return NextResponse.json({
      customers: customers.map(c => ({
        id: c.id,
        email: c.email,
        name: c.name,
        createdAt: c.createdAt.toISOString(),
        emailVerified: c.emailVerified,
        plan: c.subscription?.plan || 'free',
        subscriptionStatus: c.subscription?.status || null,
        renewsAt: c.subscription?.currentPeriodEnd?.toISOString() || null,
        cancelAtPeriodEnd: c.subscription?.cancelAtPeriodEnd || false,
        platforms: c.platformConnections.filter(p => p.connected).map(p => ({
          platform: p.platform,
          name: p.platformName,
          lastSync: p.lastSyncAt?.toISOString() || null,
        })),
        transactionCount: c._count.transactions,
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

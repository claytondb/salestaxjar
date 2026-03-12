/**
 * POST /api/drip/send
 *
 * Internal protected route for sending onboarding drip emails.
 * Used by the /api/drip/cron job (and callable manually for testing).
 *
 * Auth: Bearer token from DRIP_SECRET env var.
 *
 * Body: { userId: string, dripDay: 1 | 3 | 7 | 14 }
 *
 * Conditions checked before sending:
 *   Day 1  — no platform connections yet
 *   Day 3  — no imported orders yet
 *   Day 7  — still on free plan (no active subscription)
 *   Day 14 — still on free plan (no active subscription)
 *
 * Duplicate-safe: skips if an EmailLog entry for this template already exists.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  sendDripDay1Email,
  sendDripDay3Email,
  sendDripDay7Email,
  sendDripDay14Email,
} from '@/lib/email';

const DRIP_SECRET = process.env.DRIP_SECRET;

function isAuthorized(request: NextRequest): boolean {
  if (!DRIP_SECRET) {
    // If no secret configured, only allow in development
    return process.env.NODE_ENV === 'development';
  }
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${DRIP_SECRET}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { userId?: string; dripDay?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { userId, dripDay } = body;

  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  if (![1, 3, 7, 14].includes(dripDay as number)) {
    return NextResponse.json({ error: 'dripDay must be 1, 3, 7, or 14' }, { status: 400 });
  }

  const templateName = `drip_day${dripDay}`;

  try {
    // Look up the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Duplicate-safety check: has this drip email already been sent?
    const alreadySent = await prisma.emailLog.findFirst({
      where: {
        userId: user.id,
        template: templateName,
        status: 'sent',
      },
    });

    if (alreadySent) {
      return NextResponse.json({
        skipped: true,
        reason: 'Already sent',
        template: templateName,
      });
    }

    // Condition checks per drip day
    if (dripDay === 1) {
      // Skip if user has already connected a platform
      const platformCount = await prisma.platformConnection.count({
        where: { userId: user.id },
      });
      if (platformCount > 0) {
        return NextResponse.json({
          skipped: true,
          reason: 'User already has platform connected',
          template: templateName,
        });
      }
    }

    if (dripDay === 3) {
      // Skip if user has already imported orders
      const orderCount = await prisma.importedOrder.count({
        where: { userId: user.id },
      });
      if (orderCount > 0) {
        return NextResponse.json({
          skipped: true,
          reason: 'User already has imported orders',
          template: templateName,
        });
      }
    }

    if (dripDay === 7 || dripDay === 14) {
      // Skip if user has an active paid subscription
      const subscription = await prisma.subscription.findUnique({
        where: { userId: user.id },
        select: { status: true, plan: true },
      });
      const isPaid =
        subscription &&
        subscription.status === 'active' &&
        subscription.plan !== 'free';
      if (isPaid) {
        return NextResponse.json({
          skipped: true,
          reason: 'User is already on a paid plan',
          template: templateName,
        });
      }
    }

    // Send the appropriate email
    let result: { success: boolean; error?: string };

    switch (dripDay) {
      case 1:
        result = await sendDripDay1Email({
          to: user.email,
          name: user.name,
          userId: user.id,
        });
        break;
      case 3:
        result = await sendDripDay3Email({
          to: user.email,
          name: user.name,
          userId: user.id,
        });
        break;
      case 7:
        result = await sendDripDay7Email({
          to: user.email,
          name: user.name,
          userId: user.id,
        });
        break;
      case 14:
        result = await sendDripDay14Email({
          to: user.email,
          name: user.name,
          userId: user.id,
        });
        break;
      default:
        return NextResponse.json({ error: 'Invalid dripDay' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send email', detail: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sent: true,
      template: templateName,
      userId: user.id,
    });
  } catch (error) {
    console.error(`Drip send error (day ${dripDay}):`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

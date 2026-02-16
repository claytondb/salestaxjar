import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const BETA_SLOTS = 25;

export async function GET() {
  try {
    // Count beta users (invited or redeemed, not expired)
    const count = await prisma.betaUser.count({
      where: {
        status: { in: ['invited', 'redeemed'] },
      },
    });

    const slotsRemaining = Math.max(0, BETA_SLOTS - count);
    const isFull = slotsRemaining === 0;

    return NextResponse.json({
      totalSlots: BETA_SLOTS,
      slotsFilled: count,
      slotsRemaining,
      isFull,
    });
  } catch (error) {
    console.error('Beta status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

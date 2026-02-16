import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email?.toLowerCase().trim();
    const source = body.source || 'website';

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Check if already a beta user
    const existingBetaUser = await prisma.betaUser.findUnique({
      where: { email },
    });

    if (existingBetaUser) {
      return NextResponse.json({
        success: true,
        alreadyBeta: true,
        message: 'You\'re already on the beta list! Check your status on the beta page.',
      });
    }

    // Check if already on waitlist
    const existingWaitlist = await prisma.betaWaitlist.findUnique({
      where: { email },
    });

    if (existingWaitlist) {
      return NextResponse.json({
        success: true,
        alreadyWaitlist: true,
        message: 'You\'re already on the waitlist! We\'ll notify you when a spot opens up.',
      });
    }

    // Add to waitlist
    await prisma.betaWaitlist.create({
      data: {
        email,
        source,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'You\'re on the waitlist! We\'ll email you when a spot opens up.',
    });
  } catch (error) {
    console.error('Waitlist error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

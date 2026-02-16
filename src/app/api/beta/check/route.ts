import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email?.toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if email is in beta list
    const betaUser = await prisma.betaUser.findUnique({
      where: { email },
    });

    if (!betaUser) {
      return NextResponse.json({ 
        isInvited: false,
        message: 'Email not found in beta list',
      });
    }

    // Check if already redeemed
    const alreadyRedeemed = betaUser.status === 'redeemed' && betaUser.redeemedUserId;

    return NextResponse.json({
      isInvited: true,
      alreadyRedeemed,
      name: betaUser.name,
      message: alreadyRedeemed 
        ? 'Already redeemed - please log in'
        : 'Welcome! You can create your account.',
    });
  } catch (error) {
    console.error('Beta check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

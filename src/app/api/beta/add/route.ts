import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// Admin-only endpoint to add beta users
// For now, we'll use a simple secret key check
// In production, you'd want proper admin auth

const ADMIN_SECRET = process.env.BETA_ADMIN_SECRET || 'sails-beta-2026';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');

    // Check admin secret
    if (providedSecret !== ADMIN_SECRET) {
      // Also allow logged-in admin users (you as the owner)
      const user = await getCurrentUser();
      const adminEmails = ['ghwst.vr@gmail.com']; // Add your email(s)
      
      if (!user?.email || !adminEmails.includes(user.email)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    const { email, name, source, notes } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already exists
    const existing = await prisma.betaUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json({ 
        error: 'Email already in beta list',
        betaUser: existing,
      }, { status: 409 });
    }

    // Add to beta list
    const betaUser = await prisma.betaUser.create({
      data: {
        email: normalizedEmail,
        name: name || null,
        source: source || 'manual',
        notes: notes || null,
        status: 'invited',
      },
    });

    return NextResponse.json({ 
      success: true,
      betaUser,
      message: `Added ${normalizedEmail} to beta list`,
    }, { status: 201 });
  } catch (error) {
    console.error('Beta add error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// List all beta users
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (providedSecret !== ADMIN_SECRET) {
      const user = await getCurrentUser();
      const adminEmails = ['ghwst.vr@gmail.com'];
      
      if (!user?.email || !adminEmails.includes(user.email)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const betaUsers = await prisma.betaUser.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: betaUsers.length,
      invited: betaUsers.filter(u => u.status === 'invited').length,
      redeemed: betaUsers.filter(u => u.status === 'redeemed').length,
    };

    return NextResponse.json({ betaUsers, stats });
  } catch (error) {
    console.error('Beta list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

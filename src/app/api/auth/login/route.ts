import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  verifyPassword,
  validateEmail,
  sanitizeInput,
  createSession,
  setSessionCookie,
} from '@/lib/auth';
import { checkAuthRateLimit, rateLimitHeaders } from '@/lib/ratelimit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = sanitizeInput(body.email || '').toLowerCase();
    const password = body.password || '';

    // Rate limit check
    const rateLimit = await checkAuthRateLimit(email);
    if (!rateLimit.success) {
      return NextResponse.json(
        { 
          error: 'Too many login attempts. Please try again later.',
          waitTime: Math.ceil((rateLimit.reset - Date.now()) / 1000 / 60),
        },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { 
          error: 'Incorrect password',
          attemptsRemaining: rateLimit.remaining,
        },
        { status: 401 }
      );
    }

    // Create session
    const userAgent = request.headers.get('user-agent') || undefined;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               undefined;
    const { token } = await createSession(user.id, userAgent, ip);

    // Set session cookie
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}

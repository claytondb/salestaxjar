import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  hashPassword,
  validateEmail,
  validatePassword,
  validateName,
  sanitizeInput,
  createSession,
  setSessionCookie,
  generateVerificationToken,
} from '@/lib/auth';
import { sendWelcomeEmail, sendNewSignupNotification } from '@/lib/email';
import { checkAuthRateLimit, rateLimitHeaders } from '@/lib/ratelimit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = sanitizeInput(body.email || '').toLowerCase();
    const password = body.password || '';
    const name = sanitizeInput(body.name || '');

    // Rate limit check
    const rateLimit = await checkAuthRateLimit(email);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    // Validate inputs
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    if (!validateName(name)) {
      return NextResponse.json(
        { error: 'Please enter a valid name' },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.errors[0] },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    });

    // Create session
    const userAgent = request.headers.get('user-agent') || undefined;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               undefined;
    const { token } = await createSession(user.id, userAgent, ip);

    // Set session cookie
    await setSessionCookie(token);

    // Generate verification token and send welcome email
    const verifyToken = await generateVerificationToken(user.id);
    await sendWelcomeEmail({
      to: email,
      name,
      verifyToken,
      userId: user.id,
    });

    // Notify admin of new signup
    await sendNewSignupNotification({
      userName: name,
      userEmail: email,
    });

    // Create default notification preferences
    await prisma.notificationPreference.create({
      data: {
        userId: user.id,
      },
    });

    // Check if this is a beta user and grant them Pro
    let isBetaUser = false;
    try {
      const betaUser = await prisma.betaUser.findUnique({
        where: { email },
      });

      if (betaUser && betaUser.status === 'invited') {
        // Mark beta user as redeemed
        await prisma.betaUser.update({
          where: { email },
          data: {
            status: 'redeemed',
            redeemedAt: new Date(),
            redeemedUserId: user.id,
          },
        });

        // Create a lifetime Pro subscription for beta users
        // Using a special "beta" customer ID to distinguish from paid users
        await prisma.subscription.create({
          data: {
            userId: user.id,
            stripeCustomerId: `beta_${user.id}`,
            stripeSubscriptionId: `beta_lifetime_${user.id}`,
            stripePriceId: 'beta_pro_lifetime',
            status: 'active',
            plan: 'pro',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date('2099-12-31'), // Effectively lifetime
            cancelAtPeriodEnd: false,
          },
        });

        isBetaUser = true;
      }
    } catch (betaError) {
      // Don't fail signup if beta check fails
      console.error('Beta user check error:', betaError);
    }

    return NextResponse.json({
      success: true,
      isBetaUser,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'An error occurred during signup' },
      { status: 500 }
    );
  }
}

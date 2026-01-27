import { NextResponse } from 'next/server';
import { getCurrentUser, generateVerificationToken } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import { checkEmailRateLimit, rateLimitHeaders } from '@/lib/ratelimit';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email already verified' },
        { status: 400 }
      );
    }

    // Rate limit
    const rateLimit = await checkEmailRateLimit(user.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many verification emails sent. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    // Generate new verification token
    const token = await generateVerificationToken(user.id);

    // Send verification email
    const result = await sendWelcomeEmail({
      to: user.email,
      name: user.name,
      verifyToken: token,
      userId: user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send verification error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    );
  }
}

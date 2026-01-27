import { NextRequest, NextResponse } from 'next/server';
import { generatePasswordResetToken, sanitizeInput, validateEmail } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkEmailRateLimit, rateLimitHeaders } from '@/lib/ratelimit';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = sanitizeInput(body.email || '').toLowerCase();

    // Validate email format
    if (!validateEmail(email)) {
      // Return success even for invalid email to prevent enumeration
      return NextResponse.json({ success: true });
    }

    // Rate limit by email
    const rateLimit = await checkEmailRateLimit(email);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many reset attempts. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    // Generate reset token (returns null if user not found)
    const token = await generatePasswordResetToken(email);

    // If user exists, send reset email
    if (token) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true },
      });

      if (user) {
        await sendPasswordResetEmail({
          to: email,
          name: user.name,
          resetToken: token,
          userId: user.id,
        });
      }
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { v4 as uuidv4 } from 'uuid';

// Environment variables with fallbacks for build time
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const SESSION_DURATION_DAYS = 7;

// =============================================================================
// Password Hashing
// =============================================================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Handle legacy demo hashes
  if (hash.startsWith('$demo$')) {
    console.warn('Legacy password hash detected. User should reset password.');
    return false;
  }
  return bcrypt.compare(password, hash);
}

// =============================================================================
// JWT Token Management
// =============================================================================

interface JWTPayload {
  userId: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export function generateJWT(userId: string, sessionId: string): string {
  return jwt.sign(
    { userId, sessionId } as JWTPayload,
    JWT_SECRET,
    { expiresIn: `${SESSION_DURATION_DAYS}d` }
  );
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// =============================================================================
// Session Management
// =============================================================================

export async function createSession(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<{ sessionId: string; token: string }> {
  const sessionId = uuidv4();
  const token = generateJWT(userId, sessionId);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      id: sessionId,
      userId,
      token,
      expiresAt,
      userAgent,
      ipAddress,
    },
  });

  return { sessionId, token };
}

export async function validateSession(token: string): Promise<{
  valid: boolean;
  userId?: string;
  session?: { id: string; userId: string; expiresAt: Date };
}> {
  const payload = verifyJWT(token);
  if (!payload) {
    return { valid: false };
  }

  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
  });

  if (!session || session.token !== token || session.expiresAt < new Date()) {
    return { valid: false };
  }

  return {
    valid: true,
    userId: session.userId,
    session: {
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt,
    },
  };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await prisma.session.delete({
    where: { id: sessionId },
  }).catch(() => {
    // Session might already be deleted
  });
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  });
}

// =============================================================================
// Cookie Management
// =============================================================================

const COOKIE_NAME = 'salestaxjar_session';

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    path: '/',
  });
}

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// =============================================================================
// Get Current User (for API routes)
// =============================================================================

export async function getCurrentUser() {
  const token = await getSessionCookie();
  if (!token) {
    return null;
  }

  const { valid, userId } = await validateSession(token);
  if (!valid || !userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      createdAt: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          currentPeriodEnd: true,
        },
      },
    },
  });

  return user;
}

// =============================================================================
// Email Verification
// =============================================================================

export async function generateVerificationToken(userId: string): Promise<string> {
  const token = uuidv4();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.user.update({
    where: { id: userId },
    data: {
      verifyToken: token,
      verifyExpires: expires,
    },
  });

  return token;
}

export async function verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { verifyToken: token },
  });

  if (!user) {
    return { success: false, error: 'Invalid verification token' };
  }

  if (user.verifyExpires && user.verifyExpires < new Date()) {
    return { success: false, error: 'Verification token has expired' };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verifyToken: null,
      verifyExpires: null,
    },
  });

  return { success: true };
}

// =============================================================================
// Password Reset
// =============================================================================

export async function generatePasswordResetToken(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    return null;
  }

  const token = uuidv4();
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: token,
      resetExpires: expires,
    },
  });

  return token;
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { resetToken: token },
  });

  if (!user) {
    return { success: false, error: 'Invalid reset token' };
  }

  if (user.resetExpires && user.resetExpires < new Date()) {
    return { success: false, error: 'Reset token has expired' };
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetExpires: null,
    },
  });

  // Invalidate all existing sessions for security
  await invalidateAllUserSessions(user.id);

  return { success: true };
}

// =============================================================================
// Input Validation
// =============================================================================

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return { valid: errors.length === 0, errors };
}

export function validateName(name: string): boolean {
  return name.length >= 1 && name.length <= 100;
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '').slice(0, 1000);
}

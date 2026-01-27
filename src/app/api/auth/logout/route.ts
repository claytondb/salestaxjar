import { NextResponse } from 'next/server';
import {
  getSessionCookie,
  validateSession,
  invalidateSession,
  clearSessionCookie,
} from '@/lib/auth';

export async function POST() {
  try {
    const token = await getSessionCookie();
    
    if (token) {
      const { valid, session } = await validateSession(token);
      if (valid && session) {
        await invalidateSession(session.id);
      }
    }

    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear the cookie even if there's an error
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  }
}

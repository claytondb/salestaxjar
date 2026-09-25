/**
 * GET /api/account/export
 *
 * Download everything Sails stores about the signed-in user as JSON
 * (the "right to portability" promised in the Privacy Policy).
 * Secrets are never included: no password hash, no store credentials,
 * no API key hashes, no session tokens.
 *
 * The file is streamed: orders and calculations are read from the database a
 * page at a time and written out as they arrive. That keeps memory flat and
 * gets around the 4.5 MB limit Vercel puts on non-streamed responses, so a
 * store with years of order history can still export everything.
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { checkApiRateLimit } from '@/lib/ratelimit';
import { exportChunks } from '@/lib/account-export';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = await checkApiRateLimit(`account-export:${user.id}`);
  if (!rate.success) {
    return NextResponse.json({ error: 'Too many export requests. Please try again later.' }, { status: 429 });
  }

  const encoder = new TextEncoder();
  const chunks = exportChunks(user.id);
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await chunks.next();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(encoder.encode(value));
        }
      } catch (error) {
        console.error('[account/export] Export failed:', error);
        controller.error(error);
      }
    },
    async cancel() {
      await chunks.return(undefined);
    },
  });

  const filename = `sails-data-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

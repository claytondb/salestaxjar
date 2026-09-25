/**
 * Shared auth for scheduled jobs.
 *
 * Vercel Cron calls the job with `Authorization: Bearer <CRON_SECRET>` when the
 * CRON_SECRET environment variable is set on the project. Manual/admin tools may
 * send the same secret in an `x-cron-secret` header instead.
 *
 * With no secret configured, jobs only run in local development.
 */

import type { NextRequest } from 'next/server';

export function getCronSecret(): string | undefined {
  return process.env.CRON_SECRET || process.env.DRIP_SECRET || undefined;
}

export function isCronAuthorized(request: NextRequest | Request): boolean {
  const secret = getCronSecret();
  if (!secret) {
    return process.env.NODE_ENV === 'development';
  }
  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  const header = request.headers.get('x-cron-secret');
  return header === secret;
}

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client if configured
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: UPSTASH_REDIS_REST_URL,
        token: UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Check if rate limiting is configured
export function isRateLimitConfigured(): boolean {
  return !!redis;
}

// =============================================================================
// Rate Limiters
// =============================================================================

// General API rate limiter - 100 requests per minute
export const apiRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'ratelimit:api',
    })
  : null;

// Auth rate limiter - 5 attempts per 15 minutes (stricter for login/signup)
export const authRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      analytics: true,
      prefix: 'ratelimit:auth',
    })
  : null;

// Tax calculation rate limiter - 50 requests per minute
export const taxCalcRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(50, '1 m'),
      analytics: true,
      prefix: 'ratelimit:tax',
    })
  : null;

// Email rate limiter - 10 emails per hour
export const emailRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 h'),
      analytics: true,
      prefix: 'ratelimit:email',
    })
  : null;

// =============================================================================
// Rate Limit Checker
// =============================================================================

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
}

// In-memory fallback for when Redis is not configured
const memoryStore = new Map<string, { count: number; resetTime: number }>();

async function checkMemoryRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const key = identifier;
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetTime) {
    memoryStore.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1, reset: now + windowMs, limit };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, reset: entry.resetTime, limit };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count, reset: entry.resetTime, limit };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.resetTime) {
      memoryStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
  fallbackLimit: number = 100,
  fallbackWindowMs: number = 60000
): Promise<RateLimitResult> {
  if (limiter) {
    try {
      const result = await limiter.limit(identifier);
      return {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
        limit: result.limit,
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Fall through to memory-based rate limiting
    }
  }

  // Use in-memory rate limiting as fallback
  return checkMemoryRateLimit(identifier, fallbackLimit, fallbackWindowMs);
}

// =============================================================================
// Helper Functions for API Routes
// =============================================================================

export async function checkApiRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  return checkRateLimit(apiRateLimiter, `api:${identifier}`, 100, 60000);
}

export async function checkAuthRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  return checkRateLimit(authRateLimiter, `auth:${identifier}`, 5, 15 * 60000);
}

export async function checkTaxCalcRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  return checkRateLimit(taxCalcRateLimiter, `tax:${identifier}`, 50, 60000);
}

export async function checkEmailRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  return checkRateLimit(emailRateLimiter, `email:${identifier}`, 10, 60 * 60000);
}

// =============================================================================
// Response Headers Helper
// =============================================================================

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };
}

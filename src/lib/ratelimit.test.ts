/**
 * Rate Limiting Tests
 * Tests for the in-memory fallback rate limiter and helper functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Upstash modules before importing
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: vi.fn().mockReturnValue(null),
}));

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockReturnValue(null),
}));

// Now import the functions after mocking
import {
  isRateLimitConfigured,
  checkRateLimit,
  checkApiRateLimit,
  checkAuthRateLimit,
  checkTaxCalcRateLimit,
  checkEmailRateLimit,
  rateLimitHeaders,
} from './ratelimit';

describe('ratelimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('isRateLimitConfigured', () => {
    it('should return false when Redis is not configured', () => {
      // Without UPSTASH env vars, redis should be null
      expect(isRateLimitConfigured()).toBe(false);
    });
  });

  describe('rateLimitHeaders', () => {
    it('should return correct rate limit headers', () => {
      const result = {
        success: true,
        remaining: 95,
        reset: 1700000000000,
        limit: 100,
      };

      const headers = rateLimitHeaders(result) as Record<string, string>;

      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('95');
      expect(headers['X-RateLimit-Reset']).toBe('1700000000000');
    });

    it('should convert numbers to strings', () => {
      const result = {
        success: false,
        remaining: 0,
        reset: 9999999999999,
        limit: 5,
      };

      const headers = rateLimitHeaders(result) as Record<string, string>;

      expect(typeof headers['X-RateLimit-Limit']).toBe('string');
      expect(typeof headers['X-RateLimit-Remaining']).toBe('string');
      expect(typeof headers['X-RateLimit-Reset']).toBe('string');
    });
  });

  describe('checkRateLimit (memory fallback)', () => {
    it('should allow first request', async () => {
      const result = await checkRateLimit(null, 'test-user-1', 5, 60000);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.limit).toBe(5);
    });

    it('should decrement remaining on each request', async () => {
      const key = 'test-user-decrement';
      
      const result1 = await checkRateLimit(null, key, 5, 60000);
      expect(result1.remaining).toBe(4);

      const result2 = await checkRateLimit(null, key, 5, 60000);
      expect(result2.remaining).toBe(3);

      const result3 = await checkRateLimit(null, key, 5, 60000);
      expect(result3.remaining).toBe(2);
    });

    it('should block requests after limit is reached', async () => {
      const key = 'test-user-limit';
      
      // Make 5 requests (limit)
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(null, key, 5, 60000);
      }

      // 6th request should be blocked
      const result = await checkRateLimit(null, key, 5, 60000);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', async () => {
      const key = 'test-user-reset';
      
      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(null, key, 5, 60000);
      }

      // Verify blocked
      const blocked = await checkRateLimit(null, key, 5, 60000);
      expect(blocked.success).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(61000);

      // Should be allowed again
      const allowed = await checkRateLimit(null, key, 5, 60000);
      expect(allowed.success).toBe(true);
      expect(allowed.remaining).toBe(4);
    });

    it('should track different identifiers separately', async () => {
      const result1 = await checkRateLimit(null, 'user-a', 5, 60000);
      const result2 = await checkRateLimit(null, 'user-b', 5, 60000);

      // Both should have full quota
      expect(result1.remaining).toBe(4);
      expect(result2.remaining).toBe(4);
    });

    it('should use different limits for different identifiers', async () => {
      const result1 = await checkRateLimit(null, 'api-user', 100, 60000);
      const result2 = await checkRateLimit(null, 'auth-user', 5, 60000);

      expect(result1.limit).toBe(100);
      expect(result1.remaining).toBe(99);
      expect(result2.limit).toBe(5);
      expect(result2.remaining).toBe(4);
    });

    it('should include reset time in result', async () => {
      const now = Date.now();
      const windowMs = 60000;

      const result = await checkRateLimit(null, 'test-reset-time', 5, windowMs);

      // Reset time should be roughly now + windowMs
      expect(result.reset).toBeGreaterThanOrEqual(now + windowMs);
      expect(result.reset).toBeLessThanOrEqual(now + windowMs + 100); // Allow small timing variance
    });
  });

  describe('checkApiRateLimit', () => {
    it('should use API rate limits (100/minute)', async () => {
      const result = await checkApiRateLimit('test-api-user');

      expect(result.success).toBe(true);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(99);
    });

    it('should prefix identifier with api:', async () => {
      // Make requests with same base identifier through different helpers
      await checkApiRateLimit('same-user');
      const apiResult = await checkApiRateLimit('same-user');
      
      // Should have decremented (98 remaining)
      expect(apiResult.remaining).toBe(98);
    });
  });

  describe('checkAuthRateLimit', () => {
    it('should use stricter auth limits (5/15 minutes)', async () => {
      const result = await checkAuthRateLimit('test-auth-user');

      expect(result.success).toBe(true);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(4);
    });

    it('should block after 5 auth attempts', async () => {
      const key = 'auth-block-test';
      
      for (let i = 0; i < 5; i++) {
        await checkAuthRateLimit(key);
      }

      const blocked = await checkAuthRateLimit(key);
      expect(blocked.success).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it('should have 15 minute window', async () => {
      const key = 'auth-window-test';
      
      // Exhaust limit
      for (let i = 0; i < 5; i++) {
        await checkAuthRateLimit(key);
      }

      // Still blocked after 14 minutes
      vi.advanceTimersByTime(14 * 60 * 1000);
      const stillBlocked = await checkAuthRateLimit(key);
      expect(stillBlocked.success).toBe(false);

      // Allowed after 15+ minutes
      vi.advanceTimersByTime(2 * 60 * 1000); // Total: 16 minutes
      const allowed = await checkAuthRateLimit(key);
      expect(allowed.success).toBe(true);
    });
  });

  describe('checkTaxCalcRateLimit', () => {
    it('should use tax calculation limits (50/minute)', async () => {
      const result = await checkTaxCalcRateLimit('test-tax-user');

      expect(result.success).toBe(true);
      expect(result.limit).toBe(50);
      expect(result.remaining).toBe(49);
    });
  });

  describe('checkEmailRateLimit', () => {
    it('should use email limits (10/hour)', async () => {
      const result = await checkEmailRateLimit('test-email-user');

      expect(result.success).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
    });

    it('should have 1 hour window', async () => {
      const key = 'email-window-test';
      
      // Exhaust limit
      for (let i = 0; i < 10; i++) {
        await checkEmailRateLimit(key);
      }

      // Still blocked after 59 minutes
      vi.advanceTimersByTime(59 * 60 * 1000);
      const stillBlocked = await checkEmailRateLimit(key);
      expect(stillBlocked.success).toBe(false);

      // Allowed after 60+ minutes
      vi.advanceTimersByTime(2 * 60 * 1000); // Total: 61 minutes
      const allowed = await checkEmailRateLimit(key);
      expect(allowed.success).toBe(true);
    });
  });

  describe('rate limit isolation', () => {
    it('should isolate API, auth, tax, and email limits', async () => {
      // All should have separate counters even for same identifier
      const apiResult = await checkApiRateLimit('shared-user');
      const authResult = await checkAuthRateLimit('shared-user');
      const taxResult = await checkTaxCalcRateLimit('shared-user');
      const emailResult = await checkEmailRateLimit('shared-user');

      // Each should have full quota (first request)
      expect(apiResult.remaining).toBe(99);  // 100 - 1
      expect(authResult.remaining).toBe(4);   // 5 - 1
      expect(taxResult.remaining).toBe(49);   // 50 - 1
      expect(emailResult.remaining).toBe(9);  // 10 - 1
    });

    it('should not affect other rate limiters when one is exhausted', async () => {
      const key = 'isolation-test';
      
      // Exhaust auth limit (strictest)
      for (let i = 0; i < 6; i++) {
        await checkAuthRateLimit(key);
      }

      // Auth should be blocked
      const authBlocked = await checkAuthRateLimit(key);
      expect(authBlocked.success).toBe(false);

      // API should still work
      const apiStillWorks = await checkApiRateLimit(key);
      expect(apiStillWorks.success).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty identifier', async () => {
      const result = await checkRateLimit(null, '', 5, 60000);
      expect(result.success).toBe(true);
    });

    it('should handle special characters in identifier', async () => {
      const result = await checkRateLimit(null, 'user@example.com:192.168.1.1', 5, 60000);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should handle very short window', async () => {
      const key = 'short-window';
      
      await checkRateLimit(null, key, 2, 100); // 100ms window
      await checkRateLimit(null, key, 2, 100);
      
      const blocked = await checkRateLimit(null, key, 2, 100);
      expect(blocked.success).toBe(false);

      vi.advanceTimersByTime(150);
      
      const allowed = await checkRateLimit(null, key, 2, 100);
      expect(allowed.success).toBe(true);
    });

    it('should handle limit of 1', async () => {
      const key = 'limit-one';
      
      const first = await checkRateLimit(null, key, 1, 60000);
      expect(first.success).toBe(true);
      expect(first.remaining).toBe(0);

      const second = await checkRateLimit(null, key, 1, 60000);
      expect(second.success).toBe(false);
    });

    it('should handle high limit', async () => {
      const key = 'high-limit';
      
      const result = await checkRateLimit(null, key, 10000, 60000);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(9999);
    });
  });
});

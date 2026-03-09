/**
 * Environment Configuration Unit Tests
 * Tests for env.ts functions and service availability checks
 */

import { describe, test, expect } from 'vitest';
import { getEnv, isEnvConfigured, services, validateEnv } from './env';

describe('Environment Configuration', () => {

  // ==========================================================================
  // getEnv tests
  // ==========================================================================
  
  describe('getEnv', () => {
    test('returns TAXJAR_API_URL default when not configured', () => {
      // This tests the default value mechanism
      expect(getEnv('TAXJAR_API_URL')).toBe('https://api.taxjar.com/v2');
    });

    test('returns NEXT_PUBLIC_APP_URL default when not configured', () => {
      expect(getEnv('NEXT_PUBLIC_APP_URL')).toBe('http://localhost:3000');
    });

    test('returns FROM_EMAIL default when not configured', () => {
      expect(getEnv('FROM_EMAIL')).toBe('Sails <noreply@sails.tax>');
    });

    test('returns empty string for DATABASE_URL when not configured', () => {
      // DATABASE_URL has an empty default
      if (!process.env.DATABASE_URL) {
        expect(getEnv('DATABASE_URL')).toBe('');
      }
    });

    test('returns configured NODE_ENV value', () => {
      // NODE_ENV is typically set in test environment
      expect(getEnv('NODE_ENV')).toBeDefined();
    });
  });

  // ==========================================================================
  // isEnvConfigured tests
  // ==========================================================================
  
  describe('isEnvConfigured', () => {
    test('returns false for unconfigured DATABASE_URL', () => {
      if (!process.env.DATABASE_URL) {
        expect(isEnvConfigured('DATABASE_URL')).toBe(false);
      }
    });

    test('returns false for unconfigured STRIPE_SECRET_KEY', () => {
      if (!process.env.STRIPE_SECRET_KEY) {
        expect(isEnvConfigured('STRIPE_SECRET_KEY')).toBe(false);
      }
    });

    test('returns false for unconfigured TAXJAR_API_KEY', () => {
      if (!process.env.TAXJAR_API_KEY) {
        expect(isEnvConfigured('TAXJAR_API_KEY')).toBe(false);
      }
    });

    test('returns false for unconfigured RESEND_API_KEY', () => {
      if (!process.env.RESEND_API_KEY) {
        expect(isEnvConfigured('RESEND_API_KEY')).toBe(false);
      }
    });

    test('returns false for unconfigured UPSTASH_REDIS_REST_URL', () => {
      if (!process.env.UPSTASH_REDIS_REST_URL) {
        expect(isEnvConfigured('UPSTASH_REDIS_REST_URL')).toBe(false);
      }
    });
  });

  // ==========================================================================
  // services tests
  // ==========================================================================
  
  describe('services', () => {
    test('database reflects DATABASE_URL configuration', () => {
      expect(typeof services.database).toBe('boolean');
      expect(services.database).toBe(isEnvConfigured('DATABASE_URL'));
    });

    test('stripe reflects STRIPE_SECRET_KEY configuration', () => {
      expect(typeof services.stripe).toBe('boolean');
      expect(services.stripe).toBe(isEnvConfigured('STRIPE_SECRET_KEY'));
    });

    test('taxjar reflects TAXJAR_API_KEY configuration', () => {
      expect(typeof services.taxjar).toBe('boolean');
      expect(services.taxjar).toBe(isEnvConfigured('TAXJAR_API_KEY'));
    });

    test('email reflects RESEND_API_KEY configuration', () => {
      expect(typeof services.email).toBe('boolean');
      expect(services.email).toBe(isEnvConfigured('RESEND_API_KEY'));
    });

    test('rateLimit requires both Upstash vars', () => {
      expect(typeof services.rateLimit).toBe('boolean');
      const expected = isEnvConfigured('UPSTASH_REDIS_REST_URL') && 
                       isEnvConfigured('UPSTASH_REDIS_REST_TOKEN');
      expect(services.rateLimit).toBe(expected);
    });
  });

  // ==========================================================================
  // validateEnv tests
  // ==========================================================================
  
  describe('validateEnv', () => {
    test('returns an object with valid and errors properties', () => {
      const result = validateEnv();
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('valid is true when no errors', () => {
      const result = validateEnv();
      if (result.errors.length === 0) {
        expect(result.valid).toBe(true);
      }
    });

    test('valid is false when there are errors', () => {
      const result = validateEnv();
      if (result.errors.length > 0) {
        expect(result.valid).toBe(false);
      }
    });

    test('errors array contains strings', () => {
      const result = validateEnv();
      result.errors.forEach(error => {
        expect(typeof error).toBe('string');
      });
    });

    test('in development environment with no DATABASE_URL, should be valid', () => {
      // In development, DATABASE_URL is not required
      if (process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL) {
        const result = validateEnv();
        expect(result.errors).not.toContain('DATABASE_URL is required in production');
      }
    });
  });
});

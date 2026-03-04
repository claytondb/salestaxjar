/**
 * Unit tests for authentication utilities
 * Tests pure functions that don't require database access
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock external dependencies before importing
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('./prisma', () => ({
  prisma: {
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import {
  hashPassword,
  verifyPassword,
  generateJWT,
  verifyJWT,
  validateEmail,
  validatePassword,
  validateName,
  sanitizeInput,
} from './auth';

// =============================================================================
// Password Hashing Tests
// =============================================================================

describe('hashPassword', () => {
  test('should return a bcrypt hash string', async () => {
    const hash = await hashPassword('testpassword123');
    
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
  });

  test('should produce different hashes for the same password (salt)', async () => {
    const hash1 = await hashPassword('testpassword123');
    const hash2 = await hashPassword('testpassword123');
    
    expect(hash1).not.toBe(hash2);
  });

  test('should handle empty password', async () => {
    const hash = await hashPassword('');
    
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
  });

  test('should handle unicode passwords', async () => {
    const hash = await hashPassword('пароль123中文🔐');
    
    expect(hash).toBeDefined();
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
  });

  test('should handle very long passwords', async () => {
    const longPassword = 'a'.repeat(1000);
    const hash = await hashPassword(longPassword);
    
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
  });
});

describe('verifyPassword', () => {
  test('should return true for matching password and hash', async () => {
    const password = 'correctpassword123';
    const hash = await hashPassword(password);
    
    const result = await verifyPassword(password, hash);
    
    expect(result).toBe(true);
  });

  test('should return false for non-matching password', async () => {
    const hash = await hashPassword('correctpassword');
    
    const result = await verifyPassword('wrongpassword', hash);
    
    expect(result).toBe(false);
  });

  test('should return false for legacy demo hashes', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const result = await verifyPassword('password', '$demo$anyhash');
    
    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Legacy password hash detected. User should reset password.'
    );
    
    consoleSpy.mockRestore();
  });

  test('should handle unicode passwords correctly', async () => {
    const password = 'пароль中文🔐';
    const hash = await hashPassword(password);
    
    const result = await verifyPassword(password, hash);
    
    expect(result).toBe(true);
  });

  test('should handle case sensitivity', async () => {
    const hash = await hashPassword('Password123');
    
    const result = await verifyPassword('password123', hash);
    
    expect(result).toBe(false);
  });
});

// =============================================================================
// JWT Tests
// =============================================================================

describe('generateJWT', () => {
  test('should generate a valid JWT string', () => {
    const token = generateJWT('user-123', 'session-456');
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // Header.Payload.Signature
  });

  test('should generate different tokens for different inputs', () => {
    const token1 = generateJWT('user-1', 'session-1');
    const token2 = generateJWT('user-2', 'session-2');
    
    expect(token1).not.toBe(token2);
  });

  test('should embed userId and sessionId in payload', () => {
    const userId = 'test-user-id';
    const sessionId = 'test-session-id';
    
    const token = generateJWT(userId, sessionId);
    const payload = verifyJWT(token);
    
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe(userId);
    expect(payload?.sessionId).toBe(sessionId);
  });

  test('should include expiration time', () => {
    const token = generateJWT('user', 'session');
    const payload = verifyJWT(token);
    
    expect(payload?.exp).toBeDefined();
    expect(typeof payload?.exp).toBe('number');
    expect(payload!.exp).toBeGreaterThan(Date.now() / 1000);
  });

  test('should set expiration to ~7 days', () => {
    const token = generateJWT('user', 'session');
    const payload = verifyJWT(token);
    
    const now = Date.now() / 1000;
    const sevenDaysInSeconds = 7 * 24 * 60 * 60;
    
    // Allow 60 second margin for test execution time
    expect(payload!.exp).toBeGreaterThan(now + sevenDaysInSeconds - 60);
    expect(payload!.exp).toBeLessThan(now + sevenDaysInSeconds + 60);
  });
});

describe('verifyJWT', () => {
  test('should return payload for valid token', () => {
    const token = generateJWT('user-123', 'session-456');
    
    const payload = verifyJWT(token);
    
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe('user-123');
    expect(payload?.sessionId).toBe('session-456');
  });

  test('should return null for invalid token', () => {
    const payload = verifyJWT('invalid.token.string');
    
    expect(payload).toBeNull();
  });

  test('should return null for empty string', () => {
    const payload = verifyJWT('');
    
    expect(payload).toBeNull();
  });

  test('should return null for malformed token', () => {
    const payload = verifyJWT('not-a-jwt');
    
    expect(payload).toBeNull();
  });

  test('should return null for tampered token', () => {
    const token = generateJWT('user', 'session');
    const parts = token.split('.');
    parts[1] = 'tampered-payload';
    const tamperedToken = parts.join('.');
    
    const payload = verifyJWT(tamperedToken);
    
    expect(payload).toBeNull();
  });

  test('should include iat (issued at) timestamp', () => {
    const token = generateJWT('user', 'session');
    const payload = verifyJWT(token);
    
    expect(payload?.iat).toBeDefined();
    expect(typeof payload?.iat).toBe('number');
  });
});

// =============================================================================
// Email Validation Tests
// =============================================================================

describe('validateEmail', () => {
  test('should return true for valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  test('should return true for email with subdomain', () => {
    expect(validateEmail('user@mail.example.com')).toBe(true);
  });

  test('should return true for email with plus sign', () => {
    expect(validateEmail('user+tag@example.com')).toBe(true);
  });

  test('should return true for email with dots in local part', () => {
    expect(validateEmail('first.last@example.com')).toBe(true);
  });

  test('should return false for email without @', () => {
    expect(validateEmail('userexample.com')).toBe(false);
  });

  test('should return false for email without domain', () => {
    expect(validateEmail('user@')).toBe(false);
  });

  test('should return false for email without local part', () => {
    expect(validateEmail('@example.com')).toBe(false);
  });

  test('should return false for email with spaces', () => {
    expect(validateEmail('user @example.com')).toBe(false);
    expect(validateEmail('user@ example.com')).toBe(false);
  });

  test('should return false for empty string', () => {
    expect(validateEmail('')).toBe(false);
  });

  test('should return false for email exceeding 254 characters', () => {
    const longEmail = 'a'.repeat(250) + '@example.com';
    expect(validateEmail(longEmail)).toBe(false);
  });

  test('should return true for email at exactly 254 characters', () => {
    const localPart = 'a'.repeat(241);
    const email = localPart + '@example.com'; // 241 + 1 + 11 = 253 characters
    expect(email.length).toBeLessThanOrEqual(254);
    expect(validateEmail(email)).toBe(true);
  });

  test('should return false for email without TLD', () => {
    expect(validateEmail('user@example')).toBe(false);
  });
});

// =============================================================================
// Password Validation Tests
// =============================================================================

describe('validatePassword', () => {
  test('should return valid for strong password', () => {
    const result = validatePassword('SecurePass123');
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should reject password shorter than 8 characters', () => {
    const result = validatePassword('Short1A');
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters');
  });

  test('should reject password longer than 128 characters', () => {
    const longPassword = 'Aa1' + 'a'.repeat(130);
    const result = validatePassword(longPassword);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be less than 128 characters');
  });

  test('should reject password without uppercase letter', () => {
    const result = validatePassword('lowercase123');
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one uppercase letter');
  });

  test('should reject password without lowercase letter', () => {
    const result = validatePassword('UPPERCASE123');
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one lowercase letter');
  });

  test('should reject password without number', () => {
    const result = validatePassword('NoNumbersHere');
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one number');
  });

  test('should accumulate multiple errors', () => {
    const result = validatePassword('short');
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
    expect(result.errors).toContain('Password must be at least 8 characters');
    expect(result.errors).toContain('Password must contain at least one uppercase letter');
    expect(result.errors).toContain('Password must contain at least one number');
  });

  test('should accept password at exactly 8 characters', () => {
    const result = validatePassword('Abcdef1X');
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should accept password at exactly 128 characters', () => {
    const password = 'Aa1' + 'x'.repeat(125);
    expect(password.length).toBe(128);
    
    const result = validatePassword(password);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should accept password with special characters', () => {
    const result = validatePassword('Secure!@#$123');
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should accept password with unicode characters', () => {
    const result = validatePassword('Пароль123Aa');
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// =============================================================================
// Name Validation Tests
// =============================================================================

describe('validateName', () => {
  test('should return true for valid name', () => {
    expect(validateName('John Doe')).toBe(true);
  });

  test('should return true for single character name', () => {
    expect(validateName('A')).toBe(true);
  });

  test('should return true for name at 100 characters', () => {
    const name = 'a'.repeat(100);
    expect(validateName(name)).toBe(true);
  });

  test('should return false for empty name', () => {
    expect(validateName('')).toBe(false);
  });

  test('should return false for name exceeding 100 characters', () => {
    const name = 'a'.repeat(101);
    expect(validateName(name)).toBe(false);
  });

  test('should accept unicode names', () => {
    expect(validateName('山田太郎')).toBe(true);
    expect(validateName('Müller')).toBe(true);
    expect(validateName('José García')).toBe(true);
  });

  test('should accept names with numbers', () => {
    expect(validateName('John Smith III')).toBe(true);
    expect(validateName('User123')).toBe(true);
  });

  test('should accept names with special characters', () => {
    expect(validateName("O'Connor")).toBe(true);
    expect(validateName('Smith-Jones')).toBe(true);
  });
});

// =============================================================================
// Input Sanitization Tests
// =============================================================================

describe('sanitizeInput', () => {
  test('should trim whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  test('should remove < and > characters', () => {
    expect(sanitizeInput('hello<script>alert(1)</script>')).toBe('helloscriptalert(1)/script');
  });

  test('should handle multiple angle brackets', () => {
    expect(sanitizeInput('<div><p>test</p></div>')).toBe('divptest/p/div');
  });

  test('should truncate to 1000 characters', () => {
    const longInput = 'a'.repeat(2000);
    const result = sanitizeInput(longInput);
    
    expect(result.length).toBe(1000);
  });

  test('should handle empty string', () => {
    expect(sanitizeInput('')).toBe('');
  });

  test('should handle whitespace-only string', () => {
    expect(sanitizeInput('   ')).toBe('');
  });

  test('should preserve normal characters', () => {
    expect(sanitizeInput('Hello, World! 123')).toBe('Hello, World! 123');
  });

  test('should preserve unicode characters', () => {
    expect(sanitizeInput('你好世界')).toBe('你好世界');
    expect(sanitizeInput('Привет мир')).toBe('Привет мир');
  });

  test('should remove nested angle brackets', () => {
    expect(sanitizeInput('<<nested>>')).toBe('nested');
  });

  test('should handle input at exactly 1000 characters', () => {
    const input = 'a'.repeat(1000);
    const result = sanitizeInput(input);
    
    expect(result.length).toBe(1000);
    expect(result).toBe(input);
  });

  test('should handle mix of trim and angle bracket removal', () => {
    expect(sanitizeInput('  <test>  ')).toBe('test');
  });

  test('should handle newlines and tabs', () => {
    expect(sanitizeInput('hello\nworld\ttab')).toBe('hello\nworld\ttab');
  });
});

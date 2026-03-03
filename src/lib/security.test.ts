/**
 * Unit tests for security.ts
 * Tests password hashing, validation, rate limiting, and sanitization functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  isSessionValid,
  checkRateLimit,
  resetRateLimit,
  sanitizeInput,
  validateEmail,
  validatePassword,
  validateName,
  encryptForStorage,
  decryptFromStorage,
  SessionToken,
} from './security';

describe('security.ts', () => {
  describe('hashPassword', () => {
    it('should return a hash in the correct format', () => {
      const hash = hashPassword('myPassword123');
      expect(hash).toMatch(/^\$demo\$[a-f0-9]{32}\$.+$/);
    });

    it('should generate different hashes for the same password (due to random salt)', () => {
      const hash1 = hashPassword('samePassword');
      const hash2 = hashPassword('samePassword');
      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different passwords', () => {
      const hash1 = hashPassword('password1');
      const hash2 = hashPassword('password2');
      // The hash portion after the second $ should be different
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', () => {
      const password = 'correctPassword123';
      const hash = hashPassword(password);
      expect(verifyPassword(password, hash)).toBe(true);
    });

    it('should reject incorrect password', () => {
      const hash = hashPassword('correctPassword');
      expect(verifyPassword('wrongPassword', hash)).toBe(false);
    });

    it('should handle legacy plain text passwords', () => {
      // Legacy comparison for users before hashing was added
      expect(verifyPassword('plaintext', 'plaintext')).toBe(true);
      expect(verifyPassword('wrong', 'plaintext')).toBe(false);
    });

    it('should reject malformed hashes', () => {
      expect(verifyPassword('password', '$demo$')).toBe(false);
      expect(verifyPassword('password', '$demo$salt$')).toBe(false);
      expect(verifyPassword('password', 'notahash')).toBe(false);
    });

    it('should handle empty passwords', () => {
      const hash = hashPassword('');
      expect(verifyPassword('', hash)).toBe(true);
      expect(verifyPassword('notempty', hash)).toBe(false);
    });
  });

  describe('isSessionValid', () => {
    it('should return false for null session', () => {
      expect(isSessionValid(null)).toBe(false);
    });

    it('should return true for valid non-expired session', () => {
      const session: SessionToken = {
        token: 'test-token',
        userId: 'user123',
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000 * 60 * 60, // 1 hour from now
      };
      expect(isSessionValid(session)).toBe(true);
    });

    it('should return false for expired session', () => {
      const session: SessionToken = {
        token: 'test-token',
        userId: 'user123',
        createdAt: Date.now() - 1000 * 60 * 60 * 25, // 25 hours ago
        expiresAt: Date.now() - 1000 * 60 * 60, // 1 hour ago
      };
      expect(isSessionValid(session)).toBe(false);
    });

    it('should return false for session expiring exactly now', () => {
      const now = Date.now();
      const session: SessionToken = {
        token: 'test-token',
        userId: 'user123',
        createdAt: now - 1000,
        expiresAt: now, // Exactly now
      };
      expect(isSessionValid(session)).toBe(false);
    });
  });

  describe('checkRateLimit', () => {
    beforeEach(() => {
      // Reset rate limit state before each test
      resetRateLimit('test-key');
    });

    it('should allow first attempt', () => {
      const result = checkRateLimit('test-key');
      expect(result.allowed).toBe(true);
      expect(result.attemptsRemaining).toBe(4);
    });

    it('should track multiple attempts', () => {
      checkRateLimit('test-key'); // 1
      checkRateLimit('test-key'); // 2
      const result = checkRateLimit('test-key'); // 3
      expect(result.allowed).toBe(true);
      expect(result.attemptsRemaining).toBe(2);
    });

    it('should lock out after max attempts', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit('test-key');
      }
      const result = checkRateLimit('test-key');
      expect(result.allowed).toBe(false);
      expect(result.waitTime).toBeDefined();
      expect(result.waitTime).toBeGreaterThan(0);
    });

    it('should handle different keys independently', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit('key-1');
      }
      // key-1 should be locked
      expect(checkRateLimit('key-1').allowed).toBe(false);
      // key-2 should still be allowed
      expect(checkRateLimit('key-2').allowed).toBe(true);
    });

    it('should reset after resetRateLimit is called', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit('reset-test');
      }
      expect(checkRateLimit('reset-test').allowed).toBe(false);
      
      resetRateLimit('reset-test');
      
      const result = checkRateLimit('reset-test');
      expect(result.allowed).toBe(true);
      expect(result.attemptsRemaining).toBe(4);
    });
  });

  describe('sanitizeInput', () => {
    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
      expect(sanitizeInput('\n\ttest\n')).toBe('test');
    });

    it('should remove angle brackets (XSS prevention)', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('hello <world>')).toBe('hello world');
    });

    it('should limit length to 1000 characters', () => {
      const longInput = 'a'.repeat(2000);
      expect(sanitizeInput(longInput).length).toBe(1000);
    });

    it('should handle empty strings', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput('   ')).toBe('');
    });

    it('should preserve normal text', () => {
      expect(sanitizeInput('Hello, World!')).toBe('Hello, World!');
      expect(sanitizeInput('test@example.com')).toBe('test@example.com');
    });
  });

  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.org')).toBe(true);
      expect(validateEmail('a@b.co')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('missing@domain')).toBe(false);
      expect(validateEmail('@nodomain.com')).toBe(false);
      expect(validateEmail('no@')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('spaces in@email.com')).toBe(false);
    });

    it('should reject emails longer than 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com'; // 262 chars total
      expect(validateEmail(longEmail)).toBe(false);
    });

    it('should accept emails at exactly 254 characters', () => {
      const domain = '@example.com'; // 12 chars
      const localPart = 'a'.repeat(254 - domain.length);
      expect(validateEmail(localPart + domain)).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('should accept valid passwords', () => {
      const result = validatePassword('StrongPass123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject passwords shorter than 8 characters', () => {
      const result = validatePassword('Short1A');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('should reject passwords longer than 128 characters', () => {
      const result = validatePassword('Aa1' + 'x'.repeat(130));
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be less than 128 characters');
    });

    it('should require uppercase letter', () => {
      const result = validatePassword('lowercase123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require lowercase letter', () => {
      const result = validatePassword('UPPERCASE123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should require a number', () => {
      const result = validatePassword('NoNumbersHere');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should return multiple errors for very weak passwords', () => {
      const result = validatePassword('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should accept passwords at exactly 8 characters', () => {
      const result = validatePassword('Abcdefg1');
      expect(result.valid).toBe(true);
    });

    it('should accept passwords at exactly 128 characters', () => {
      const result = validatePassword('Aa1' + 'x'.repeat(125));
      expect(result.valid).toBe(true);
    });
  });

  describe('validateName', () => {
    it('should accept valid names', () => {
      expect(validateName('John')).toBe(true);
      expect(validateName('Mary Jane')).toBe(true);
      expect(validateName("O'Connor")).toBe(true);
      expect(validateName('Smith-Jones')).toBe(true);
    });

    it('should reject empty names', () => {
      expect(validateName('')).toBe(false);
    });

    it('should reject names with numbers', () => {
      expect(validateName('John123')).toBe(false);
    });

    it('should reject names with special characters', () => {
      expect(validateName('John@Doe')).toBe(false);
      expect(validateName('John!Doe')).toBe(false);
    });

    it('should reject names longer than 100 characters', () => {
      expect(validateName('A'.repeat(101))).toBe(false);
    });

    it('should accept names at exactly 100 characters', () => {
      expect(validateName('A'.repeat(100))).toBe(true);
    });

    it('should accept single character names', () => {
      expect(validateName('A')).toBe(true);
    });
  });

  describe('encryptForStorage / decryptFromStorage', () => {
    it('should encrypt and decrypt data correctly', () => {
      const original = 'sensitive data';
      const encrypted = encryptForStorage(original);
      const decrypted = decryptFromStorage(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should produce different output than input', () => {
      const original = 'test data';
      const encrypted = encryptForStorage(original);
      expect(encrypted).not.toBe(original);
    });

    it('should handle special characters', () => {
      const original = 'data with émojis 🎉 and "quotes"';
      const encrypted = encryptForStorage(original);
      const decrypted = decryptFromStorage(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should handle empty strings', () => {
      const encrypted = encryptForStorage('');
      const decrypted = decryptFromStorage(encrypted);
      expect(decrypted).toBe('');
    });

    it('should return null for invalid encrypted data', () => {
      expect(decryptFromStorage('not-base64!')).toBe(null);
      expect(decryptFromStorage('')).toBe(null);
    });

    it('should return null for data without encryption marker', () => {
      // Valid base64 but missing ENC: prefix
      const noMarker = btoa('no encryption marker');
      expect(decryptFromStorage(noMarker)).toBe(null);
    });

    it('should handle long strings', () => {
      const original = 'x'.repeat(10000);
      const encrypted = encryptForStorage(original);
      const decrypted = decryptFromStorage(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should handle JSON strings', () => {
      const original = JSON.stringify({ user: 'test', data: [1, 2, 3] });
      const encrypted = encryptForStorage(original);
      const decrypted = decryptFromStorage(encrypted);
      expect(JSON.parse(decrypted!)).toEqual({ user: 'test', data: [1, 2, 3] });
    });
  });
});

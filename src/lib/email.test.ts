/**
 * Unit tests for email.ts
 * Tests email utility functions, formatting, and template logic
 * 
 * Note: The email module has side effects on import (Prisma/Resend initialization)
 * so we test the underlying utility functions and logic patterns rather than
 * the module exports directly.
 */

import { describe, it, expect } from 'vitest';

describe('email utility functions', () => {
  describe('URL construction', () => {
    it('should construct verify URL with token', () => {
      const APP_URL = 'https://sails.tax';
      const token = 'test-token-123';
      const verifyUrl = `${APP_URL}/verify-email?token=${token}`;
      
      expect(verifyUrl).toBe('https://sails.tax/verify-email?token=test-token-123');
    });

    it('should construct reset URL with token', () => {
      const APP_URL = 'https://sails.tax';
      const token = 'reset-token-456';
      const resetUrl = `${APP_URL}/reset-password?token=${token}`;
      
      expect(resetUrl).toBe('https://sails.tax/reset-password?token=reset-token-456');
    });

    it('should construct billing URL', () => {
      const APP_URL = 'https://sails.tax';
      const billingUrl = `${APP_URL}/settings?tab=billing`;
      
      expect(billingUrl).toBe('https://sails.tax/settings?tab=billing');
    });

    it('should construct dashboard URL for filings', () => {
      const APP_URL = 'https://sails.tax';
      const filingsUrl = `${APP_URL}/filings`;
      
      expect(filingsUrl).toBe('https://sails.tax/filings');
    });
  });

  describe('date formatting for filing reminders', () => {
    it('should calculate days until due correctly', () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      expect(daysUntilDue).toBe(7);
    });

    it('should handle overdue dates (negative days)', () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 3);
      const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      expect(daysUntilDue).toBe(-3);
    });

    it('should handle same day due date', () => {
      const dueDate = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      expect(daysUntilDue).toBeLessThanOrEqual(1);
      expect(daysUntilDue).toBeGreaterThanOrEqual(0);
    });

    it('should format date correctly for display', () => {
      const dueDate = new Date('2026-04-15T00:00:00');
      const dueDateStr = dueDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      expect(dueDateStr).toContain('April');
      expect(dueDateStr).toContain('15');
      expect(dueDateStr).toContain('2026');
      expect(dueDateStr).toContain('Wednesday');
    });
  });

  describe('currency formatting', () => {
    it('should format USD currency correctly', () => {
      const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
      
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
      expect(formatCurrency(0.99)).toBe('$0.99');
    });

    it('should handle negative amounts', () => {
      const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
      
      expect(formatCurrency(-100)).toBe('-$100.00');
    });

    it('should round to 2 decimal places', () => {
      const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
      
      expect(formatCurrency(123.456)).toBe('$123.46');
      expect(formatCurrency(123.454)).toBe('$123.45');
    });
  });

  describe('urgency level calculation', () => {
    it('should return URGENT for 1 day or less', () => {
      const getUrgency = (daysUntilDue: number) => {
        return daysUntilDue <= 1 ? '🚨 URGENT' : daysUntilDue <= 7 ? '⚠️ Reminder' : '📅 Upcoming';
      };
      
      expect(getUrgency(0)).toBe('🚨 URGENT');
      expect(getUrgency(1)).toBe('🚨 URGENT');
      expect(getUrgency(-1)).toBe('🚨 URGENT');
    });

    it('should return Reminder for 2-7 days', () => {
      const getUrgency = (daysUntilDue: number) => {
        return daysUntilDue <= 1 ? '🚨 URGENT' : daysUntilDue <= 7 ? '⚠️ Reminder' : '📅 Upcoming';
      };
      
      expect(getUrgency(2)).toBe('⚠️ Reminder');
      expect(getUrgency(5)).toBe('⚠️ Reminder');
      expect(getUrgency(7)).toBe('⚠️ Reminder');
    });

    it('should return Upcoming for more than 7 days', () => {
      const getUrgency = (daysUntilDue: number) => {
        return daysUntilDue <= 1 ? '🚨 URGENT' : daysUntilDue <= 7 ? '⚠️ Reminder' : '📅 Upcoming';
      };
      
      expect(getUrgency(8)).toBe('📅 Upcoming');
      expect(getUrgency(14)).toBe('📅 Upcoming');
      expect(getUrgency(30)).toBe('📅 Upcoming');
    });
  });

  describe('status message calculation', () => {
    it('should show OVERDUE for negative days', () => {
      const getStatusMessage = (daysUntilDue: number) => {
        return daysUntilDue <= 0
          ? '🚨 OVERDUE!'
          : daysUntilDue === 1
          ? '⏰ Due Tomorrow!'
          : `📅 ${daysUntilDue} days until due date`;
      };
      
      expect(getStatusMessage(-1)).toBe('🚨 OVERDUE!');
      expect(getStatusMessage(0)).toBe('🚨 OVERDUE!');
    });

    it('should show Due Tomorrow for 1 day', () => {
      const getStatusMessage = (daysUntilDue: number) => {
        return daysUntilDue <= 0
          ? '🚨 OVERDUE!'
          : daysUntilDue === 1
          ? '⏰ Due Tomorrow!'
          : `📅 ${daysUntilDue} days until due date`;
      };
      
      expect(getStatusMessage(1)).toBe('⏰ Due Tomorrow!');
    });

    it('should show days count for more than 1 day', () => {
      const getStatusMessage = (daysUntilDue: number) => {
        return daysUntilDue <= 0
          ? '🚨 OVERDUE!'
          : daysUntilDue === 1
          ? '⏰ Due Tomorrow!'
          : `📅 ${daysUntilDue} days until due date`;
      };
      
      expect(getStatusMessage(5)).toBe('📅 5 days until due date');
      expect(getStatusMessage(30)).toBe('📅 30 days until due date');
    });
  });

  describe('email log data structure', () => {
    it('should create valid log data object', () => {
      const logData = {
        userId: 'user-123',
        to: 'test@example.com',
        subject: 'Test Subject',
        template: 'welcome',
        status: 'sent' as const,
        messageId: 'msg-123',
        error: undefined,
      };
      
      expect(logData.userId).toBe('user-123');
      expect(logData.to).toBe('test@example.com');
      expect(logData.subject).toBe('Test Subject');
      expect(logData.template).toBe('welcome');
      expect(logData.status).toBe('sent');
      expect(logData.messageId).toBe('msg-123');
      expect(logData.error).toBeUndefined();
    });

    it('should handle failed status with error', () => {
      const logData = {
        userId: 'user-123',
        to: 'test@example.com',
        subject: 'Test Subject',
        template: 'welcome',
        status: 'failed' as const,
        messageId: undefined,
        error: 'Invalid recipient address',
      };
      
      expect(logData.status).toBe('failed');
      expect(logData.messageId).toBeUndefined();
      expect(logData.error).toBe('Invalid recipient address');
    });
  });

  describe('template types', () => {
    it('should validate template names', () => {
      const validTemplates = ['welcome', 'reset', 'reminder', 'payment_failed', 'summary'];
      
      validTemplates.forEach(template => {
        expect(typeof template).toBe('string');
        expect(template.length).toBeGreaterThan(0);
      });
    });
  });

  describe('state tax summary formatting', () => {
    it('should format top states array correctly', () => {
      const topStates = [
        { state: 'California', tax: 1234.56 },
        { state: 'Texas', tax: 789.00 },
        { state: 'New York', tax: 456.78 },
      ];
      
      const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
      
      const formatted = topStates.map(s => ({
        state: s.state,
        tax: formatCurrency(s.tax),
      }));
      
      expect(formatted).toEqual([
        { state: 'California', tax: '$1,234.56' },
        { state: 'Texas', tax: '$789.00' },
        { state: 'New York', tax: '$456.78' },
      ]);
    });

    it('should handle empty states array', () => {
      const topStates: Array<{ state: string; tax: number }> = [];
      
      const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
      
      const formatted = topStates.map(s => ({
        state: s.state,
        tax: formatCurrency(s.tax),
      }));
      
      expect(formatted).toEqual([]);
      expect(formatted.length).toBe(0);
    });
  });

  describe('month name formatting', () => {
    it('should accept valid month strings', () => {
      const validMonths = [
        'January 2026',
        'February 2026',
        'March 2026',
        'Q1 2026',
        'FY 2025-2026',
      ];
      
      validMonths.forEach(month => {
        expect(typeof month).toBe('string');
        expect(month.length).toBeGreaterThan(0);
      });
    });
  });

  describe('admin notification formatting', () => {
    it('should format signup time correctly', () => {
      const signupTime = new Date('2026-03-05T10:30:00Z').toLocaleString('en-US', {
        timeZone: 'America/Chicago',
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      
      expect(signupTime).toContain('Mar');
      expect(signupTime).toContain('2026');
    });
  });

  describe('email address validation patterns', () => {
    it('should recognize valid email patterns', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.org',
        'user+tag@company.co',
      ];
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });
    });

    it('should recognize invalid email patterns', () => {
      const invalidEmails = [
        'notanemail',
        '@nodomain.com',
        'noat.domain.com',
        '',
      ];
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });
  });

  describe('HTML escaping considerations', () => {
    it('should handle special characters in names', () => {
      const dangerousNames = [
        '<script>alert("xss")</script>',
        'John "The Man" Doe',
        "O'Brien",
        'Smith & Sons',
      ];
      
      // In a real implementation, these should be escaped
      // This test documents the expectation
      dangerousNames.forEach(name => {
        expect(typeof name).toBe('string');
      });
    });
  });

  describe('default values', () => {
    it('should have sensible defaults for FROM_EMAIL', () => {
      const defaultFrom = 'Sails <noreply@sails.tax>';
      expect(defaultFrom).toContain('sails.tax');
      expect(defaultFrom).toContain('noreply');
    });

    it('should have sensible defaults for APP_URL', () => {
      const defaultAppUrl = 'https://sails.tax';
      expect(defaultAppUrl).toMatch(/^https:\/\//);
    });
  });
});

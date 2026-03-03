/**
 * Unit tests for email-alerts.ts
 * 
 * Tests the pure helper functions used for nexus alert emails
 */

import { describe, it, expect, vi } from 'vitest';

// Mock prisma before importing email-alerts
vi.mock('./prisma', () => ({
  prisma: {
    emailLog: {
      create: vi.fn(),
    },
  },
}));

import {
  formatCurrency,
  getAlertConfig,
  nexusAlertEmailTemplate,
  NexusAlertEmailParams,
} from './email-alerts';

describe('email-alerts.ts', () => {
  // ============================================================================
  // formatCurrency tests
  // ============================================================================
  describe('formatCurrency', () => {
    it('formats whole dollar amounts without cents', () => {
      expect(formatCurrency(100000)).toBe('$100,000');
      expect(formatCurrency(50000)).toBe('$50,000');
      expect(formatCurrency(1000)).toBe('$1,000');
    });

    it('rounds decimal amounts to whole dollars', () => {
      expect(formatCurrency(99999.99)).toBe('$100,000');
      expect(formatCurrency(12345.67)).toBe('$12,346');
      expect(formatCurrency(100.49)).toBe('$100');
    });

    it('handles zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0');
    });

    it('handles small amounts', () => {
      expect(formatCurrency(1)).toBe('$1');
      expect(formatCurrency(99)).toBe('$99');
      expect(formatCurrency(999)).toBe('$999');
    });

    it('handles large amounts with proper comma formatting', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000');
      expect(formatCurrency(10000000)).toBe('$10,000,000');
      expect(formatCurrency(123456789)).toBe('$123,456,789');
    });

    it('handles negative amounts (edge case)', () => {
      // Intl.NumberFormat handles negatives gracefully
      expect(formatCurrency(-1000)).toBe('-$1,000');
    });
  });

  // ============================================================================
  // getAlertConfig tests
  // ============================================================================
  describe('getAlertConfig', () => {
    it('returns correct config for "exceeded" level', () => {
      const config = getAlertConfig('exceeded');
      expect(config.emoji).toBe('🚨');
      expect(config.urgency).toBe('Action Required');
      expect(config.bgColor).toBe('#fef2f2');
      expect(config.borderColor).toBe('#ef4444');
      expect(config.textColor).toBe('#dc2626');
      expect(config.actionText).toContain('need to register');
    });

    it('returns correct config for "warning" level', () => {
      const config = getAlertConfig('warning');
      expect(config.emoji).toBe('⚠️');
      expect(config.urgency).toBe('Warning');
      expect(config.bgColor).toBe('#fff7ed');
      expect(config.borderColor).toBe('#f97316');
      expect(config.textColor).toBe('#ea580c');
      expect(config.actionText).toContain('prepare to register');
    });

    it('returns correct config for "approaching" level', () => {
      const config = getAlertConfig('approaching');
      expect(config.emoji).toBe('📊');
      expect(config.urgency).toBe('Heads Up');
      expect(config.bgColor).toBe('#fefce8');
      expect(config.borderColor).toBe('#eab308');
      expect(config.textColor).toBe('#ca8a04');
      expect(config.actionText).toContain('Keep an eye');
    });

    it('returns default config for "safe" level', () => {
      const config = getAlertConfig('safe');
      expect(config.emoji).toBe('📊');
      expect(config.urgency).toBe('Info');
      expect(config.bgColor).toBe('#f0fdf4');
      expect(config.borderColor).toBe('#22c55e');
      expect(config.textColor).toBe('#16a34a');
      expect(config.actionText).toBe('');
    });

    it('returns default config for unknown levels', () => {
      // TypeScript would catch this, but test runtime behavior
      const config = getAlertConfig('unknown' as any);
      expect(config.urgency).toBe('Info');
    });

    it('each config level uses distinct colors', () => {
      const exceeded = getAlertConfig('exceeded');
      const warning = getAlertConfig('warning');
      const approaching = getAlertConfig('approaching');
      const safe = getAlertConfig('safe');

      // All background colors should be unique
      const bgColors = [exceeded.bgColor, warning.bgColor, approaching.bgColor, safe.bgColor];
      expect(new Set(bgColors).size).toBe(4);

      // All border colors should be unique
      const borderColors = [exceeded.borderColor, warning.borderColor, approaching.borderColor, safe.borderColor];
      expect(new Set(borderColors).size).toBe(4);
    });
  });

  // ============================================================================
  // nexusAlertEmailTemplate tests
  // ============================================================================
  describe('nexusAlertEmailTemplate', () => {
    const baseParams: NexusAlertEmailParams = {
      to: 'test@example.com',
      name: 'Test User',
      userId: 'user123',
      stateCode: 'CA',
      stateName: 'California',
      alertLevel: 'warning',
      salesAmount: 85000,
      threshold: 100000,
      percentage: 85,
    };

    describe('subject line generation', () => {
      it('includes emoji based on alert level', () => {
        const { subject } = nexusAlertEmailTemplate({ ...baseParams, alertLevel: 'exceeded' });
        expect(subject).toContain('🚨');

        const { subject: warningSubject } = nexusAlertEmailTemplate({ ...baseParams, alertLevel: 'warning' });
        expect(warningSubject).toContain('⚠️');

        const { subject: approachingSubject } = nexusAlertEmailTemplate({ ...baseParams, alertLevel: 'approaching' });
        expect(approachingSubject).toContain('📊');
      });

      it('includes state name', () => {
        const { subject } = nexusAlertEmailTemplate(baseParams);
        expect(subject).toContain('California');
      });

      it('includes rounded percentage', () => {
        const { subject } = nexusAlertEmailTemplate({ ...baseParams, percentage: 85.7 });
        expect(subject).toContain('86%');
      });

      it('includes urgency level text', () => {
        const { subject } = nexusAlertEmailTemplate({ ...baseParams, alertLevel: 'exceeded' });
        expect(subject).toContain('Action Required');
      });
    });

    describe('HTML content', () => {
      it('includes user name', () => {
        const { html } = nexusAlertEmailTemplate(baseParams);
        expect(html).toContain('Hi Test User');
      });

      it('includes state name', () => {
        const { html } = nexusAlertEmailTemplate(baseParams);
        expect(html).toContain('California');
      });

      it('includes formatted sales amount', () => {
        const { html } = nexusAlertEmailTemplate(baseParams);
        expect(html).toContain('$85,000');
      });

      it('includes formatted threshold', () => {
        const { html } = nexusAlertEmailTemplate(baseParams);
        expect(html).toContain('$100,000');
      });

      it('includes percentage', () => {
        const { html } = nexusAlertEmailTemplate(baseParams);
        expect(html).toContain('85%');
      });

      it('includes CTA link to nexus page', () => {
        const { html } = nexusAlertEmailTemplate(baseParams);
        expect(html).toContain('/nexus');
        expect(html).toContain('View Nexus Exposure');
      });

      it('includes settings link for managing notifications', () => {
        const { html } = nexusAlertEmailTemplate(baseParams);
        expect(html).toContain('/settings#notifications');
      });

      it('includes current year in footer', () => {
        const { html } = nexusAlertEmailTemplate(baseParams);
        expect(html).toContain(new Date().getFullYear().toString());
      });

      it('uses appropriate colors for exceeded level', () => {
        const { html } = nexusAlertEmailTemplate({ ...baseParams, alertLevel: 'exceeded' });
        expect(html).toContain('#ef4444'); // border color for exceeded
        expect(html).toContain('#dc2626'); // text color for exceeded
      });

      it('uses appropriate colors for warning level', () => {
        const { html } = nexusAlertEmailTemplate({ ...baseParams, alertLevel: 'warning' });
        expect(html).toContain('#f97316'); // border color for warning
        expect(html).toContain('#ea580c'); // text color for warning
      });
    });

    describe('plain text content', () => {
      it('includes user name', () => {
        const { text } = nexusAlertEmailTemplate(baseParams);
        expect(text).toContain('Hi Test User');
      });

      it('includes state name', () => {
        const { text } = nexusAlertEmailTemplate(baseParams);
        expect(text).toContain('California');
      });

      it('includes formatted sales amount', () => {
        const { text } = nexusAlertEmailTemplate(baseParams);
        expect(text).toContain('$85,000');
      });

      it('includes formatted threshold', () => {
        const { text } = nexusAlertEmailTemplate(baseParams);
        expect(text).toContain('$100,000');
      });

      it('includes percentage', () => {
        const { text } = nexusAlertEmailTemplate(baseParams);
        expect(text).toContain('85%');
      });

      it('includes emoji', () => {
        const { text } = nexusAlertEmailTemplate(baseParams);
        expect(text).toContain('⚠️');
      });

      it('includes nexus exposure link', () => {
        const { text } = nexusAlertEmailTemplate(baseParams);
        expect(text).toContain('/nexus');
      });

      it('includes notification settings link', () => {
        const { text } = nexusAlertEmailTemplate(baseParams);
        expect(text).toContain('/settings#notifications');
      });
    });

    describe('edge cases', () => {
      it('handles 100% threshold (at limit)', () => {
        const { subject, html, text } = nexusAlertEmailTemplate({
          ...baseParams,
          salesAmount: 100000,
          percentage: 100,
        });
        expect(subject).toContain('100%');
        expect(html).toContain('100%');
        expect(text).toContain('100%');
      });

      it('handles over 100% threshold', () => {
        const { subject, html, text } = nexusAlertEmailTemplate({
          ...baseParams,
          alertLevel: 'exceeded',
          salesAmount: 150000,
          percentage: 150,
        });
        // Progress bar should cap at 100% width
        expect(html).toContain('width: 100%');
        expect(subject).toContain('150%');
      });

      it('handles very small percentages', () => {
        const { subject, html, text } = nexusAlertEmailTemplate({
          ...baseParams,
          alertLevel: 'safe',
          salesAmount: 500,
          percentage: 0.5,
        });
        expect(subject).toContain('1%'); // Rounds up from 0.5
        expect(html).toContain('$500');
      });

      it('handles states with long names', () => {
        const { subject, html, text } = nexusAlertEmailTemplate({
          ...baseParams,
          stateName: 'District of Columbia',
        });
        expect(subject).toContain('District of Columbia');
        expect(html).toContain('District of Columbia');
        expect(text).toContain('District of Columbia');
      });

      it('handles user names with special characters', () => {
        const { html, text } = nexusAlertEmailTemplate({
          ...baseParams,
          name: "O'Brien & Associates",
        });
        // Template doesn't HTML-escape the name (acceptable for email HTML)
        expect(html).toContain("O'Brien & Associates");
        expect(text).toContain("O'Brien & Associates");
      });

      it('handles very large sales amounts', () => {
        const { html, text } = nexusAlertEmailTemplate({
          ...baseParams,
          salesAmount: 1234567890,
        });
        expect(html).toContain('$1,234,567,890');
        expect(text).toContain('$1,234,567,890');
      });
    });
  });
});

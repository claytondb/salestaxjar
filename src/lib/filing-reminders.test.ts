import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma so the module can load without a real DB connection
vi.mock('@/lib/prisma', () => ({
  prisma: {
    emailLog: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'log-1' }),
    },
  },
}));

import {
  formatDueDate,
  formatTaxAmount,
  getReminderKey,
  getUrgencyLabel,
  buildFilingReminderEmail,
  type FilingReminderParams,
} from './filing-reminders';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

function makeParams(overrides: Partial<FilingReminderParams> = {}): FilingReminderParams {
  return {
    to: 'user@example.com',
    name: 'Alex',
    userId: 'user-1',
    filingId: 'filing-1',
    stateCode: 'IL',
    stateName: 'Illinois',
    periodLabel: 'Q1 2026',
    dueDate: new Date('2026-04-20T00:00:00Z'),
    daysUntilDue: 7,
    estimatedTax: 5000, // $50.00 in cents
    ...overrides,
  };
}

// ─── formatDueDate ─────────────────────────────────────────────────────────────

describe('formatDueDate', () => {
  it('formats a UTC date as "Month Day, Year"', () => {
    expect(formatDueDate(new Date('2026-04-20T00:00:00Z'))).toBe('April 20, 2026');
  });

  it('formats January 1', () => {
    expect(formatDueDate(new Date('2026-01-01T00:00:00Z'))).toBe('January 1, 2026');
  });

  it('formats December 31', () => {
    expect(formatDueDate(new Date('2026-12-31T00:00:00Z'))).toBe('December 31, 2026');
  });
});

// ─── formatTaxAmount ───────────────────────────────────────────────────────────

describe('formatTaxAmount', () => {
  it('formats null as "unknown"', () => {
    expect(formatTaxAmount(null)).toBe('unknown');
  });

  it('formats 0 cents as $0.00', () => {
    expect(formatTaxAmount(0)).toBe('$0.00');
  });

  it('formats 5000 cents as $50.00', () => {
    expect(formatTaxAmount(5000)).toBe('$50.00');
  });

  it('formats 123456 cents as $1,234.56', () => {
    expect(formatTaxAmount(123456)).toBe('$1,234.56');
  });

  it('formats 100000 cents as $1,000.00', () => {
    expect(formatTaxAmount(100000)).toBe('$1,000.00');
  });
});

// ─── getReminderKey ────────────────────────────────────────────────────────────

describe('getReminderKey', () => {
  it('generates a 7-day key', () => {
    expect(getReminderKey('filing-abc', 7)).toBe('filing_reminder_7d_filing-abc');
  });

  it('generates a 1-day key', () => {
    expect(getReminderKey('filing-xyz', 1)).toBe('filing_reminder_1d_filing-xyz');
  });

  it('uses the filing id verbatim', () => {
    const key = getReminderKey('cld-abc-123', 7);
    expect(key).toContain('cld-abc-123');
  });
});

// ─── getUrgencyLabel ───────────────────────────────────────────────────────────

describe('getUrgencyLabel', () => {
  it('returns red urgency for 1 day', () => {
    const u = getUrgencyLabel(1);
    expect(u.emoji).toBe('🚨');
    expect(u.label).toBe('Due Tomorrow');
    expect(u.color).toBe('#dc2626');
  });

  it('returns red urgency for 0 days', () => {
    const u = getUrgencyLabel(0);
    expect(u.emoji).toBe('🚨');
    expect(u.label).toBe('Due Tomorrow');
  });

  it('returns amber urgency for 7 days', () => {
    const u = getUrgencyLabel(7);
    expect(u.emoji).toBe('📅');
    expect(u.label).toBe('Due in 7 Days');
    expect(u.color).toBe('#d97706');
  });

  it('returns amber urgency for 2+ days', () => {
    const u = getUrgencyLabel(5);
    expect(u.emoji).toBe('📅');
  });

  it('includes bgColor and borderColor for each level', () => {
    const u7 = getUrgencyLabel(7);
    expect(u7.bgColor).toBeTruthy();
    expect(u7.borderColor).toBeTruthy();

    const u1 = getUrgencyLabel(1);
    expect(u1.bgColor).toBeTruthy();
    expect(u1.borderColor).toBeTruthy();
  });
});

// ─── buildFilingReminderEmail ──────────────────────────────────────────────────

describe('buildFilingReminderEmail', () => {
  describe('7-day reminder', () => {
    it('generates a subject with 7 Days language', () => {
      const { subject } = buildFilingReminderEmail(makeParams({ daysUntilDue: 7 }));
      expect(subject).toContain('7 Days');
      expect(subject).toContain('Illinois');
      expect(subject).toContain('Q1 2026');
    });

    it('mentions "7 days" in the body text', () => {
      const { text } = buildFilingReminderEmail(makeParams({ daysUntilDue: 7 }));
      expect(text).toContain('in 7 days');
    });

    it('includes the period label in HTML', () => {
      const { html } = buildFilingReminderEmail(makeParams({ daysUntilDue: 7 }));
      expect(html).toContain('Q1 2026');
    });

    it('includes the state name', () => {
      const { html, text } = buildFilingReminderEmail(makeParams({ daysUntilDue: 7 }));
      expect(html).toContain('Illinois');
      expect(text).toContain('Illinois');
    });

    it('includes the formatted due date', () => {
      const { html, text } = buildFilingReminderEmail(makeParams({ daysUntilDue: 7 }));
      expect(html).toContain('April 20, 2026');
      expect(text).toContain('April 20, 2026');
    });
  });

  describe('1-day reminder', () => {
    it('generates a subject with "Due Tomorrow" language', () => {
      const { subject } = buildFilingReminderEmail(makeParams({ daysUntilDue: 1 }));
      expect(subject).toContain('Due Tomorrow');
      expect(subject).toContain('🚨');
    });

    it('mentions "tomorrow" in the body text', () => {
      const { text } = buildFilingReminderEmail(makeParams({ daysUntilDue: 1 }));
      expect(text).toContain('tomorrow');
    });

    it('uses 🚨 emoji in HTML urgency banner', () => {
      const { html } = buildFilingReminderEmail(makeParams({ daysUntilDue: 1 }));
      expect(html).toContain('🚨');
    });
  });

  describe('tax amount display', () => {
    it('shows formatted tax amount when provided', () => {
      const { html, text } = buildFilingReminderEmail(makeParams({ estimatedTax: 7500 }));
      expect(html).toContain('$75.00');
      expect(text).toContain('$75.00');
    });

    it('omits estimated tax when null', () => {
      const { html, text } = buildFilingReminderEmail(makeParams({ estimatedTax: null }));
      expect(html).not.toContain('Estimated Tax');
      expect(text).not.toContain('Estimated Tax');
    });

    it('shows $0.00 when tax is zero', () => {
      const { text } = buildFilingReminderEmail(makeParams({ estimatedTax: 0 }));
      expect(text).toContain('$0.00');
    });
  });

  describe('user personalisation', () => {
    it('addresses the user by name', () => {
      const { html, text } = buildFilingReminderEmail(makeParams({ name: 'Jordan' }));
      expect(html).toContain('Hi Jordan');
      expect(text).toContain('Hi Jordan');
    });
  });

  describe('CTA and footer', () => {
    it('includes a link to the filings dashboard', () => {
      const { html, text } = buildFilingReminderEmail(makeParams());
      expect(html).toContain('/dashboard?tab=filings');
      expect(text).toContain('/dashboard?tab=filings');
    });

    it('includes the Sails branding', () => {
      const { html } = buildFilingReminderEmail(makeParams());
      expect(html).toContain('Sails');
      expect(html).toContain('sails.tax');
    });
  });

  describe('output structure', () => {
    it('returns subject, html, and text', () => {
      const result = buildFilingReminderEmail(makeParams());
      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('text');
    });

    it('HTML starts with DOCTYPE', () => {
      const { html } = buildFilingReminderEmail(makeParams());
      expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/i);
    });

    it('plain text is non-empty', () => {
      const { text } = buildFilingReminderEmail(makeParams());
      expect(text.length).toBeGreaterThan(100);
    });
  });

  describe('state code variations', () => {
    it('shows TX state', () => {
      const params = makeParams({ stateCode: 'TX', stateName: 'Texas' });
      const { html } = buildFilingReminderEmail(params);
      expect(html).toContain('Texas');
      expect(html).toContain('TX');
    });

    it('shows CA state', () => {
      const params = makeParams({ stateCode: 'CA', stateName: 'California' });
      const { text } = buildFilingReminderEmail(params);
      expect(text).toContain('California (CA)');
    });
  });
});

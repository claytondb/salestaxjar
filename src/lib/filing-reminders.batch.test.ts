import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    filing: { findMany: vi.fn() },
    notificationPreference: { findMany: vi.fn() },
    emailLog: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import {
  processBatchReminders,
  buildFilingReminderDigestEmail,
  describeFilingPeriod,
  getReminderKey,
} from './filing-reminders'

const DUE = new Date('2026-10-20T00:00:00Z')

function filing(id: string, stateCode: string, user: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return {
    id,
    stateCode,
    period: 'quarterly',
    periodStart: new Date('2026-07-01T00:00:00Z'),
    periodEnd: new Date('2026-09-30T00:00:00Z'),
    dueDate: DUE,
    estimatedTax: null,
    business: { user },
    ...extra,
  }
}

const alex = { id: 'u-alex', email: 'alex@example.com', name: 'Alex', emailVerified: true }
const sam = { id: 'u-sam', email: 'sam@example.com', name: 'Sam', emailVerified: true }
const unverified = { id: 'u-new', email: 'new@example.com', name: 'New', emailVerified: false }
const optedOut = { id: 'u-quiet', email: 'quiet@example.com', name: 'Quiet', emailVerified: true }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(prisma.filing.findMany).mockResolvedValue([
    filing('f1', 'TX', alex),
    filing('f2', 'GA', alex),
    filing('f3', 'NY', alex, { periodStart: new Date('2026-06-01T00:00:00Z'), periodEnd: new Date('2026-08-31T00:00:00Z') }),
    filing('f4', 'WA', sam, { estimatedTax: 123.45 }),
    filing('f5', 'CO', unverified),
    filing('f6', 'IL', optedOut),
  ] as never)
  vi.mocked(prisma.notificationPreference.findMany).mockResolvedValue([{ userId: 'u-quiet' }] as never)
  vi.mocked(prisma.emailLog.findMany).mockResolvedValue([])
  vi.mocked(prisma.emailLog.create).mockResolvedValue({} as never)
})

describe('processBatchReminders', () => {
  it('sends one email per person listing every return due that day', async () => {
    const result = await processBatchReminders(7)
    expect(result).toMatchObject({ processed: 6, sent: 4, alreadySent: 0, failed: 0, emails: 2 })

    const logs = vi.mocked(prisma.emailLog.create).mock.calls.map(([a]) => a.data)
    const alexLogs = logs.filter((l) => l.userId === 'u-alex')
    expect(alexLogs.map((l) => l.template).sort()).toEqual(['f1', 'f2', 'f3'].map((id) => getReminderKey(id, 7)).sort())
    expect(new Set(alexLogs.map((l) => l.subject))).toEqual(new Set(['📅 3 sales tax returns due in 7 days (October 20, 2026)']))
    expect(logs.filter((l) => l.userId === 'u-sam')[0].subject).toBe('📅 Sales Tax Due in 7 Days — Washington Q3 2026')
  })

  it('skips unverified addresses and people who turned reminders off', async () => {
    await processBatchReminders(7)
    const users = new Set(vi.mocked(prisma.emailLog.create).mock.calls.map(([a]) => a.data.userId))
    expect(users.has('u-new')).toBe(false)
    expect(users.has('u-quiet')).toBe(false)
  })

  it('does not remind the same return twice in a window', async () => {
    vi.mocked(prisma.emailLog.findMany).mockImplementation((async (args: { where: { userId: string } }) =>
      args.where.userId === 'u-alex' ? [{ template: getReminderKey('f2', 7) }] : []) as never)
    const result = await processBatchReminders(7)
    expect(result).toMatchObject({ sent: 3, alreadySent: 1, emails: 2 })
    const alexSubjects = vi.mocked(prisma.emailLog.create).mock.calls
      .map(([a]) => a.data)
      .filter((l) => l.userId === 'u-alex')
      .map((l) => l.subject)
    expect(alexSubjects[0]).toBe('📅 2 sales tax returns due in 7 days (October 20, 2026)')
  })

  it('counts only sent logs as already sent', async () => {
    await processBatchReminders(1)
    const where = vi.mocked(prisma.emailLog.findMany).mock.calls[0][0]?.where
    expect(where).toMatchObject({ status: 'sent' })
  })
})

describe('buildFilingReminderDigestEmail', () => {
  it('lists each state and period, with estimated tax when known', () => {
    const { subject, html, text } = buildFilingReminderDigestEmail({
      to: 'a@example.com',
      name: 'Alex <script>',
      userId: 'u',
      dueDate: DUE,
      daysUntilDue: 1,
      items: [
        { filingId: 'a', stateCode: 'GA', stateName: 'Georgia', periodLabel: 'Q3 2026', estimatedTax: 1500 },
        { filingId: 'b', stateCode: 'TX', stateName: 'Texas', periodLabel: 'Q3 2026', estimatedTax: null },
      ],
    })
    expect(subject).toBe('🚨 2 sales tax returns due tomorrow (October 20, 2026)')
    expect(html).toContain('Georgia (GA)')
    expect(html).toContain('$15.00')
    expect(html).toContain('Alex &lt;script&gt;')
    expect(text).toContain('• Texas (TX) — Q3 2026')
    expect(text).toContain('https://sails.tax/filings')
  })
})

describe('describeFilingPeriod', () => {
  const d = (s: string) => new Date(`${s}T00:00:00Z`)
  it('names periods the way people say them', () => {
    expect(describeFilingPeriod('monthly', d('2026-09-01'), d('2026-09-30'))).toBe('September 2026')
    expect(describeFilingPeriod('quarterly', d('2026-07-01'), d('2026-09-30'))).toBe('Q3 2026')
    expect(describeFilingPeriod('quarterly', d('2026-09-01'), d('2026-11-30'))).toBe('Sep–Nov 2026')
    expect(describeFilingPeriod('quarterly', d('2025-12-01'), d('2026-02-28'))).toBe('Dec 2025–Feb 2026')
    expect(describeFilingPeriod('annual', d('2026-01-01'), d('2026-12-31'))).toBe('Annual 2026')
    expect(describeFilingPeriod('annual', d('2025-10-01'), d('2026-09-30'))).toBe('Oct 2025–Sep 2026')
  })
})

import { describe, it, expect } from 'vitest'
import { daysUntilDue, dueInWords, dueMonthKey, formatDueDate } from './due-dates'

describe('due dates', () => {
  it('shows the stored calendar date whatever the viewer’s time zone', () => {
    expect(formatDueDate('2026-10-20T00:00:00.000Z')).toBe('Oct 20, 2026')
    expect(formatDueDate('2026-07-31T00:00:00.000Z', { weekday: 'short', month: 'short', day: 'numeric' })).toBe('Fri, Jul 31')
    expect(dueMonthKey('2026-11-01T00:00:00.000Z')).toBe('2026-11')
  })

  it('counts whole days from today', () => {
    const now = new Date(2026, 9, 19, 21, 30) // Oct 19, 9:30 pm local
    expect(daysUntilDue('2026-10-20T00:00:00.000Z', now)).toBe(1)
    expect(daysUntilDue('2026-10-19T00:00:00.000Z', now)).toBe(0)
    expect(daysUntilDue('2026-10-15T00:00:00.000Z', now)).toBe(-4)
  })

  it('says it in words', () => {
    expect(dueInWords(0)).toBe('Due today')
    expect(dueInWords(1)).toBe('1 day left')
    expect(dueInWords(12)).toBe('12 days left')
    expect(dueInWords(-1)).toBe('1 day overdue')
    expect(dueInWords(-3)).toBe('3 days overdue')
  })
})

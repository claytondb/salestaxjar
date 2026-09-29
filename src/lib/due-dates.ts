/**
 * Filing due dates (and period dates) are calendar dates, stored as midnight
 * UTC. Shown in a US time zone as-is they'd land on the day before, so format
 * and count them as plain dates.
 */

const DAY = 86_400_000;

/** Format a stored due date as the calendar date it is. */
export function formatDueDate(iso: string | Date, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }): string {
  return new Date(iso).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
}

/** Whole days from today (the viewer's calendar day) to the due date: 0 = due today, negative = past due. */
export function daysUntilDue(iso: string | Date, now: number | Date = Date.now()): number {
  const due = new Date(iso);
  const dueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const n = new Date(now);
  const today = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
  return Math.round((dueDay - today) / DAY);
}

/** "Due today", "1 day left", "12 days left", "3 days overdue" */
export function dueInWords(days: number): string {
  if (days === 0) return 'Due today';
  if (days > 0) return `${days} ${days === 1 ? 'day' : 'days'} left`;
  const late = -days;
  return `${late} ${late === 1 ? 'day' : 'days'} overdue`;
}

/** "2026-10" for grouping due dates by calendar month */
export function dueMonthKey(iso: string | Date): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

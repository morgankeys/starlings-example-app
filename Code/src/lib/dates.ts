import {
  addDays,
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isThisYear,
  nextMonday,
  parseISO,
} from 'date-fns';

export const todayISO = () => format(new Date(), 'yyyy-MM-dd');
export const dayFromToday = (n: number) => format(addDays(new Date(), n), 'yyyy-MM-dd');
export const nextWeekISO = () => format(nextMonday(new Date()), 'yyyy-MM-dd');

/** Days from today to a yyyy-MM-dd date (negative = past). */
export const daysUntil = (date: string) => differenceInCalendarDays(parseISO(date), new Date());

export type DueState = 'overdue' | 'today' | 'soon' | 'later' | 'none';

export function dueState(date: string | null, done = false): DueState {
  if (!date || done) return 'none';
  const d = daysUntil(date);
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  if (d <= 2) return 'soon';
  return 'later';
}

/** "Today", "Tomorrow", "Yesterday", "Fri", "Oct 28", "Mar 3, 2027". */
export function formatDue(date: string | null): string {
  if (!date) return 'No date';
  const d = daysUntil(date);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  const parsed = parseISO(date);
  if (d > 1 && d < 7) return format(parsed, 'EEE');
  return format(parsed, isThisYear(parsed) ? 'MMM d' : 'MMM d, yyyy');
}

export function formatLongDue(date: string | null): string {
  if (!date) return 'No due date';
  const d = daysUntil(date);
  const label = format(parseISO(date), 'EEEE, MMM d');
  if (d < 0) return `${label} · ${-d} day${d === -1 ? '' : 's'} overdue`;
  if (d === 0) return `Today · ${label}`;
  if (d === 1) return `Tomorrow · ${label}`;
  return label;
}

/** "just now", "5m ago", "3h ago", "2d ago", then a date. */
export function timeAgo(ts: string): string {
  const date = new Date(ts);
  const seconds = (Date.now() - date.getTime()) / 1000;
  if (seconds < 60) return 'just now';
  if (seconds < 7 * 86400) {
    return formatDistanceToNowStrict(date, { roundingMethod: 'floor' })
      .replace(/ minutes?/, 'm')
      .replace(/ hours?/, 'h')
      .replace(/ days?/, 'd')
      .concat(' ago');
  }
  return format(date, isThisYear(date) ? 'MMM d' : 'MMM d, yyyy');
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

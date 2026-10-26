// Seed dates are relative to the day the workspace is seeded, so the demo always has
// overdue, today, this week and later work. db.ts shifts them forward as days pass.
import { addDays, format, setHours, setMinutes, startOfDay } from 'date-fns';

export interface SeedClock {
  /** Calendar date `offset` days from the seed day (yyyy-MM-dd). */
  day: (offset: number) => string;
  /** Timestamp `offset` days from the seed day, at the given local hour. */
  at: (offset: number, hour?: number, minute?: number) => string;
  /** Timestamp `minutes` before the moment of seeding, but never before today began, so
   *  "today" items are neither in the future nor on yesterday's date. */
  ago: (minutes: number) => string;
}

export function seedClock(today: Date): SeedClock {
  const base = startOfDay(today);
  return {
    day: (offset) => format(addDays(base, offset), 'yyyy-MM-dd'),
    at: (offset, hour = 10, minute = 0) =>
      setMinutes(setHours(addDays(base, offset), hour), minute).toISOString(),
    ago: (minutes) =>
      new Date(
        Math.min(
          today.getTime(),
          Math.max(base.getTime() + 60_000, today.getTime() - minutes * 60_000),
        ),
      ).toISOString(),
  };
}

// The mock database: an in-memory object persisted to localStorage so changes survive a
// reload. Only the mock backend touches it; the app talks to it over HTTP via MSW.
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { Database } from './db-types';
import { DB_VERSION, buildDatabase } from './seed';

const STORAGE_KEY = 'birdy.db';
let db: Database | null = null;

function load(): Database {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Database;
      if (parsed.meta?.version === DB_VERSION) return shiftToToday(parsed);
    }
  } catch {
    // Corrupt or unavailable storage: fall through to a fresh seed.
  }
  return buildDatabase(new Date());
}

export function getDb(): Database {
  if (!db) {
    db = load();
    save();
  }
  return db;
}

export function save(): void {
  if (!db) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Storage full or blocked: the session keeps working in memory.
  }
}

/** Replace the database with a fresh seed, keeping who is signed in. */
export function resetDb(mode: 'seed' | 'empty' = 'seed'): void {
  const sessionUserId = db?.sessionUserId ?? null;
  db = buildDatabase(new Date(), mode);
  db.sessionUserId = sessionUserId;
  save();
}

// ---- Keeping the demo current ----------------------------------------------------------
// Seed dates are relative to the seed day. When the stored data is from an earlier day,
// move every date forward by the same number of days so "overdue" and "today" still mean
// what they meant when the data was seeded.

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T/;

function shiftValue(value: unknown, days: number): unknown {
  if (typeof value === 'string') {
    if (DATE_ONLY.test(value)) return format(addDays(parseISO(value), days), 'yyyy-MM-dd');
    if (TIMESTAMP.test(value)) return addDays(new Date(value), days).toISOString();
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => shiftValue(v, days));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, k === 'meta' ? v : shiftValue(v, days)]),
    );
  }
  return value;
}

function shiftToToday(data: Database): Database {
  const today = format(new Date(), 'yyyy-MM-dd');
  const days = differenceInCalendarDays(parseISO(today), parseISO(data.meta.seededOn));
  if (days <= 0) return data;
  const shifted = shiftValue(data, days) as Database;
  shifted.meta = { ...data.meta, seededOn: today };
  return shifted;
}

// ---- Ids -------------------------------------------------------------------------------

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

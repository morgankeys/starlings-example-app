import { useCallback, useSyncExternalStore } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
const KEY = 'birdy.theme';
const listeners = new Set<() => void>();

function read(): ThemePreference {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    // ignore
  }
  return 'system';
}

function apply(pref: ThemePreference) {
  const root = document.documentElement;
  if (pref === 'system') delete root.dataset.theme;
  else root.dataset.theme = pref;
}

export function applyStoredTheme() {
  apply(read());
}

export function setTheme(pref: ThemePreference) {
  try {
    if (pref === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // ignore
  }
  apply(pref);
  listeners.forEach((l) => l());
}

export function useTheme() {
  const pref = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => 'system' as ThemePreference,
  );
  const toggle = useCallback(() => {
    const dark =
      pref === 'dark' ||
      (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setTheme(dark ? 'light' : 'dark');
  }, [pref]);
  return { preference: pref, setTheme, toggle };
}

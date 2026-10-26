import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface TaskSelection {
  selected: ReadonlySet<string>;
  /**
   * Toggle one task. With `shift`, select every task between the last clicked one and
   * this one, using `order` (the ids as they appear on screen).
   */
  toggle: (id: string, shift: boolean, order: string[]) => void;
  /** Select or deselect a whole group of ids. */
  setMany: (ids: string[], on: boolean) => void;
  clear: () => void;
}

/**
 * Which tasks are selected in a list. Lives in component state, not the URL.
 *
 * - `existingIds`: every task in the data; selected ids that disappear are pruned.
 * - `resetKey`: changing it (filters, layout) clears the selection.
 * - `enabled`: when false the selection is always empty.
 */
export function useTaskSelection(
  existingIds: string[],
  resetKey: string,
  enabled = true,
): TaskSelection {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const anchor = useRef<string | null>(null);

  const clear = useCallback(() => {
    anchor.current = null;
    setSelected((prev) => (prev.size ? new Set() : prev));
  }, []);

  useEffect(clear, [resetKey, enabled, clear]);

  useEffect(() => {
    const live = new Set(existingIds);
    setSelected((prev) => {
      if ([...prev].every((id) => live.has(id))) return prev;
      return new Set([...prev].filter((id) => live.has(id)));
    });
  }, [existingIds]);

  const toggle = useCallback((id: string, shift: boolean, order: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const from = anchor.current ? order.indexOf(anchor.current) : -1;
      const to = order.indexOf(id);
      if (shift && from !== -1 && to !== -1) {
        // The range takes the state of the anchor, as in most list UIs.
        const on = prev.has(anchor.current!);
        const [lo, hi] = from < to ? [from, to] : [to, from];
        order.slice(lo, hi + 1).forEach((x) => (on ? next.add(x) : next.delete(x)));
      } else if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    anchor.current = id;
  }, []);

  const setMany = useCallback((ids: string[], on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });
    anchor.current = null;
  }, []);

  return useMemo(
    () => ({ selected: enabled ? selected : new Set<string>(), toggle, setMany, clear }),
    [enabled, selected, toggle, setMany, clear],
  );
}

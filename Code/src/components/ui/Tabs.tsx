import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import styles from './Tabs.module.css';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/** Accessible tab list (arrow keys move between tabs). Render the panel yourself with `tabPanelProps`. */
export function Tabs<T extends string>({
  label,
  value,
  onChange,
  items,
  children,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  items: TabItem<T>[];
  children: ReactNode;
}) {
  const id = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = items.findIndex((t) => t.value === value);
    const next = items[(i + (e.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length];
    onChange(next.value);
    listRef.current?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus();
  };
  return (
    <div data-component="Tabs" className={styles.tabs}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        className={styles.list}
        onKeyDown={onKeyDown}
      >
        {items.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            id={`${id}-${t.value}`}
            data-value={t.value}
            aria-selected={t.value === value}
            aria-controls={`${id}-panel`}
            tabIndex={t.value === value ? 0 : -1}
            className={styles.tab}
            onClick={() => onChange(t.value)}
          >
            {t.label}
            {t.count !== undefined && <span className={styles.count}>{t.count}</span>}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${value}`}
        className={styles.panel}
      >
        {children}
      </div>
    </div>
  );
}

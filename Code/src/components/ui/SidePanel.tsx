import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { IconButton } from './IconButton';
import styles from './SidePanel.module.css';

/**
 * A panel docked on the right of the app shell (task and file details, Ask Birdy).
 * Not modal: the page stays usable. Escape closes it while focus is inside, unless the
 * panel has a deeper view to leave first (`onEscape`).
 */
export function SidePanel({
  label,
  title,
  actions,
  onClose,
  onEscape,
  children,
  footer,
  width = 'drawer',
}: {
  /** Accessible name for the panel. */
  label: string;
  title?: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
  /** Handles Escape instead of closing, e.g. to step back from a sub-view. */
  onEscape?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'drawer' | 'assistant';
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) (onEscape ?? onClose)();
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [onClose, onEscape]);

  return (
    <aside
      ref={ref}
      data-component="SidePanel"
      data-width={width}
      aria-label={label}
      className={styles.panel}
    >
      <header className={styles.header}>
        <div className={styles.title}>{title}</div>
        {actions}
        <IconButton label="Close" icon={<X />} onClick={onClose} />
      </header>
      <div className={styles.body}>{children}</div>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </aside>
  );
}

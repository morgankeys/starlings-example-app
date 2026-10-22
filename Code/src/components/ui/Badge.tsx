import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeTone =
  | 'neutral'
  | 'success'
  | 'info'
  | 'warning'
  | 'danger'
  | 'ai'
  | 'teal'
  | 'violet'
  | 'amber'
  | 'sky'
  | 'rust';

/** Small pill for status, labels and counts. Tints only behind their own accent. */
export function Badge({
  tone = 'neutral',
  icon,
  children,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span data-component="Badge" data-tone={tone} className={styles.badge}>
      {icon}
      {children}
    </span>
  );
}

/** A colored dot, e.g. for projects and teams. */
export function Dot({
  color,
}: {
  color: 'teal' | 'violet' | 'amber' | 'sky' | 'rust' | 'neutral';
}) {
  return <span data-component="Dot" data-color={color} className={styles.dot} aria-hidden />;
}

import { CircleAlert, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import styles from './States.module.css';

/** Nothing here yet. Always says what to do next when there is something to do. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'md',
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  size?: 'sm' | 'md';
}) {
  return (
    <div data-component="EmptyState" data-size={size} className={styles.empty}>
      {icon && <div className={styles.emptyIcon}>{icon}</div>}
      <p className={styles.emptyTitle}>{title}</p>
      {description && <p className={styles.emptyDescription}>{description}</p>}
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  );
}

/** A failed request, with a retry. */
export function ErrorState({
  error,
  onRetry,
  compact,
}: {
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <div
      data-component="ErrorState"
      data-size={compact ? 'sm' : 'md'}
      className={styles.error}
      role="alert"
    >
      <CircleAlert className={styles.errorIcon} aria-hidden />
      <div className={styles.errorText}>
        <p className={styles.errorTitle}>Couldn't load this</p>
        <p className={styles.errorMessage}>{message}</p>
      </div>
      {onRetry && (
        <Button size="sm" icon={<RotateCw />} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Loading placeholder lines. */
export function Skeleton({
  lines = 3,
  size = 'md',
}: {
  lines?: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <div
      data-component="Skeleton"
      data-size={size}
      className={styles.skeleton}
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className={styles.line} />
      ))}
    </div>
  );
}

/** Inline message, e.g. why a control is unavailable. */
export function Notice({
  tone = 'neutral',
  icon,
  children,
}: {
  tone?: 'neutral' | 'warning' | 'ai';
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div data-component="Notice" data-tone={tone} className={styles.notice}>
      {icon}
      <div>{children}</div>
    </div>
  );
}

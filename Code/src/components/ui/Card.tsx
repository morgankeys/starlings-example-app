import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

/** A raised surface with a hairline border. Optional header with title and actions. */
export function Card({
  title,
  icon,
  actions,
  children,
  padding = 'md',
  className,
  ...rest
}: {
  title?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  padding?: 'none' | 'md';
} & Omit<HTMLAttributes<HTMLElement>, 'title'>) {
  return (
    <section
      data-component="Card"
      data-padding={padding}
      className={[styles.card, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {(title || actions) && (
        <header className={styles.header}>
          {title && (
            <h2 className={styles.title}>
              {icon}
              {title}
            </h2>
          )}
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      <div className={styles.body}>{children}</div>
    </section>
  );
}

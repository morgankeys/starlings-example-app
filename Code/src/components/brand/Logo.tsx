import styles from './Logo.module.css';

/** The Birdy mark: a bird in flight on a rounded tile. */
export function Logo({
  size = 'md',
  withWordmark = false,
}: {
  size?: 'md' | 'lg';
  withWordmark?: boolean;
}) {
  return (
    <span data-component="Logo" data-size={size} className={styles.logo}>
      <svg viewBox="0 0 32 32" className={styles.mark} aria-hidden>
        <rect width="32" height="32" rx="8" className={styles.tile} />
        <path
          className={styles.bird}
          d="M8 20c3.5 0 6-2.2 7.2-5.6C16.6 10.6 19.5 9 23 9.5l-1.6 2.3 2.6.7c-1.2.6-2 1.4-2.4 2.6C20.4 19.6 16.8 23 12 23c-1.6 0-3-.4-4-1l2.4-1.2z"
        />
      </svg>
      {withWordmark ? (
        <span className={styles.wordmark}>Birdy</span>
      ) : (
        <span className={styles.srOnly}>Birdy</span>
      )}
    </span>
  );
}

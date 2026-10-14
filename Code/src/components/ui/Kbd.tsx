import styles from './Kbd.module.css';

export function Kbd({ children }: { children: string }) {
  return (
    <kbd data-component="Kbd" className={styles.kbd}>
      {children}
    </kbd>
  );
}

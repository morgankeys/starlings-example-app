import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './Breadcrumbs.module.css';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav data-component="Breadcrumbs" aria-label="Breadcrumb" className={styles.nav}>
      <ol className={styles.list}>
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className={styles.item}>
              {c.to && !last ? (
                <Link to={c.to} className={styles.link}>
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className={styles.current}>
                  {c.label}
                </span>
              )}
              {!last && <ChevronRight className={styles.separator} aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

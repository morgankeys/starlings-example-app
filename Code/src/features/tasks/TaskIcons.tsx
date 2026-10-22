import type { TaskPriority, TaskStatus } from '@/domain/types';
import { PRIORITY_LABEL, STATUS_LABEL } from './meta';
import styles from './TaskIcons.module.css';

/** Status as a progress ring: empty, half, three-quarters, filled with a check. */
export function StatusIcon({ status, title = true }: { status: TaskStatus; title?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={styles.status}
      data-status={status}
      role="img"
      aria-label={STATUS_LABEL[status]}
    >
      {title && <title>{STATUS_LABEL[status]}</title>}
      {status === 'done' ? (
        <>
          <circle cx="8" cy="8" r="7" className={styles.fill} />
          <path d="M5 8.2 7 10.2 11 6" className={styles.check} />
        </>
      ) : (
        <>
          <circle cx="8" cy="8" r="6.25" className={styles.ring} />
          {status === 'in_progress' && <path d="M8 4a4 4 0 0 1 0 8z" className={styles.fill} />}
          {status === 'in_review' && <path d="M8 4a4 4 0 1 1-4 4h4z" className={styles.fill} />}
        </>
      )}
    </svg>
  );
}

/** Priority as signal bars; urgent is a filled square with an exclamation mark. */
export function PriorityIcon({ priority }: { priority: TaskPriority }) {
  const bars = { urgent: 3, high: 3, medium: 2, low: 1 }[priority];
  return (
    <svg
      viewBox="0 0 16 16"
      className={styles.priority}
      data-priority={priority}
      role="img"
      aria-label={`${PRIORITY_LABEL[priority]} priority`}
    >
      <title>{`${PRIORITY_LABEL[priority]} priority`}</title>
      {priority === 'urgent' ? (
        <>
          <rect x="1.5" y="1.5" width="13" height="13" rx="3" className={styles.fill} />
          <path d="M8 4.5v4.5M8 11.3v.2" className={styles.mark} />
        </>
      ) : (
        [0, 1, 2].map((i) => (
          <rect
            key={i}
            x={2.5 + i * 4}
            y={10 - i * 3}
            width="3"
            height={4 + i * 3}
            rx="1"
            className={i < bars ? styles.fill : styles.empty}
          />
        ))
      )}
    </svg>
  );
}

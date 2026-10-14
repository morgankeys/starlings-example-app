import { Star } from 'lucide-react';
import { usePanels } from '@/app/panels';
import type { FileItem } from '@/domain/types';
import { timeAgo } from '@/lib/dates';
import { useUserMap } from '@/features/org/api';
import { FileIcon } from './FileIcon';
import styles from './FileList.module.css';

/** Compact file list for cards and side columns. */
export function FileList({
  files,
  show = 'updated',
}: {
  files: FileItem[];
  show?: 'updated' | 'owner';
}) {
  const { openFile, fileId } = usePanels();
  const users = useUserMap();
  return (
    <ul className={styles.list} data-component="FileList">
      {files.map((f) => (
        <li key={f.id}>
          <button
            type="button"
            className={styles.item}
            data-selected={fileId === f.id}
            onClick={() => openFile(f.id)}
          >
            <FileIcon kind={f.kind} />
            <span className={styles.text}>
              <span className={styles.name}>{f.name}</span>
              <span className={styles.meta}>
                {show === 'owner'
                  ? `From ${users.get(f.ownerId)?.name ?? 'someone'}`
                  : `${users.get(f.updatedById)?.name.split(' ')[0] ?? 'Someone'} edited ${timeAgo(f.updatedAt)}`}
              </span>
            </span>
            {f.starred && <Star className={styles.star} aria-label="Starred" />}
          </button>
        </li>
      ))}
    </ul>
  );
}

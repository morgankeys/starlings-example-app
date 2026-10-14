import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Dialog, EmptyState, ErrorState, Input, Skeleton } from '@/components/ui';
import { timeAgo } from '@/lib/dates';
import { useFiles } from './api';
import { FileIcon } from './FileIcon';
import styles from './FilePickerDialog.module.css';

/** Choose one file the user can open (used to link files to tasks). */
export function FilePickerDialog({
  open,
  onOpenChange,
  onPick,
  exclude = [],
  title = 'Link a file',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (fileId: string) => void;
  exclude?: string[];
  title?: string;
}) {
  const { data, error, isPending, refetch } = useFiles('all', 200);
  const [q, setQ] = useState('');
  const files = useMemo(
    () =>
      (data ?? []).filter(
        (f) => !exclude.includes(f.id) && f.name.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [data, exclude, q],
  );
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Only files you can open are listed."
    >
      <div className={styles.body}>
        <div className={styles.search}>
          <Search aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search files"
            aria-label="Search files"
            autoFocus
          />
        </div>
        {isPending && <Skeleton lines={5} />}
        {error && <ErrorState error={error} onRetry={refetch} compact />}
        {data && files.length === 0 && <EmptyState size="sm" title="No matching files" />}
        <ul className={styles.list}>
          {files.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                className={styles.item}
                onClick={() => {
                  onPick(f.id);
                  onOpenChange(false);
                }}
              >
                <FileIcon kind={f.kind} />
                <span className={styles.name}>{f.name}</span>
                <span className={styles.when}>{timeAgo(f.updatedAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}

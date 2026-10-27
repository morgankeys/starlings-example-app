import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessagesSquare, Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { assistantApi } from '@/api/endpoints';
import { keys } from '@/api/keys';
import { EmptyState, ErrorState, IconButton, Skeleton, useToast } from '@/components/ui';
import { timeAgo } from '@/lib/dates';
import styles from './ThreadHistory.module.css';

/**
 * Past Ask Birdy conversations. Choosing one opens it; deleting one is soft, with an Undo
 * toast that restores it. Back and Escape (handled by the panel) return to the chat.
 */
export function ThreadHistory({
  currentId,
  onOpen,
  onDeleted,
}: {
  currentId: string | null;
  onOpen: (id: string) => void;
  /** Called after the open conversation is deleted, so the chat can reset. */
  onDeleted: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const toast = useToast();
  // Opening History unmounts the button that was clicked; keep focus inside the panel so
  // Escape still steps back.
  useEffect(() => ref.current?.focus(), []);

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: keys.threads,
    queryFn: assistantApi.threads,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: keys.threads });

  // Not a mutation hook: the toast outlives this list (Escape or Back unmounts it).
  const restore = (id: string) =>
    assistantApi.restoreThread(id).then(refresh, (err: Error) =>
      toast({
        title: "Couldn't restore the conversation",
        description: err.message,
        tone: 'danger',
      }),
    );

  const remove = useMutation({
    mutationFn: (id: string) => assistantApi.deleteThread(id),
    onSuccess: (_void, id) => {
      refresh();
      if (id === currentId) onDeleted(id);
      toast({
        title: 'Conversation deleted',
        action: { label: 'Undo', onClick: () => restore(id) },
      });
    },
    onError: (err: Error) =>
      toast({
        title: "Couldn't delete the conversation",
        description: err.message,
        tone: 'danger',
      }),
  });

  return (
    <div ref={ref} tabIndex={-1} data-component="ThreadHistory" className={styles.history}>
      <h2 className={styles.heading}>History</h2>
      {error ? (
        <ErrorState error={error} onRetry={refetch} compact />
      ) : isLoading ? (
        <div className={styles.loading} aria-busy="true">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ) : data && data.length > 0 ? (
        <ul className={styles.list}>
          {data.map((t) => (
            <li key={t.id} className={styles.row} data-current={t.id === currentId || undefined}>
              <button
                type="button"
                className={styles.open}
                aria-current={t.id === currentId ? 'true' : undefined}
                onClick={() => onOpen(t.id)}
              >
                <span className={styles.title}>{t.title}</span>
                <span className={styles.meta}>
                  {timeAgo(t.updatedAt)} · {t.messageCount} message{t.messageCount === 1 ? '' : 's'}
                </span>
              </button>
              <IconButton
                label={`Delete “${t.title}”`}
                icon={<Trash2 />}
                size="sm"
                disabled={remove.isPending}
                onClick={() => remove.mutate(t.id)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          size="sm"
          icon={<MessagesSquare aria-hidden />}
          title="No past conversations yet"
          description="Questions you ask Birdy are saved here."
        />
      )}
    </div>
  );
}

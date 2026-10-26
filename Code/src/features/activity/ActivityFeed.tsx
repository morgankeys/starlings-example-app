import { Activity } from 'lucide-react';
import { usePanels } from '@/app/panels';
import { Avatar, Card, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import type { ActivityFeedItem, User } from '@/domain/types';
import { useUserMap } from '@/features/org/api';
import { timeAgo } from '@/lib/dates';
import { useActivity } from './api';
import { feedSentence } from './sentence';
import styles from './ActivityFeed.module.css';

const UNKNOWN: Pick<User, 'name' | 'color'> = { name: 'Someone', color: 'sky' };

/** What other people did on your work and your files, newest first. Lives on Home. */
export function ActivityFeed() {
  const { data, error, isPending, refetch } = useActivity(15);
  const users = useUserMap();
  const { openTask, openFile } = usePanels();

  const open = (item: ActivityFeedItem) => {
    if (item.taskId) openTask(item.taskId);
    else if (item.fileId) openFile(item.fileId);
  };

  return (
    <Card title="Activity" icon={<Activity />} padding="none">
      <div className={styles.body}>
        {isPending && <Skeleton lines={5} />}
        {error && <ErrorState error={error} onRetry={refetch} compact />}
        {data?.length === 0 && (
          <EmptyState
            size="sm"
            title="No activity yet"
            description="Comments, status changes and file edits from your teammates show up here."
          />
        )}
        {!!data?.length && (
          <ul className={styles.list} data-component="ActivityFeed">
            {data.map((item) => {
              const actor = users.get(item.actorId);
              const sentence = feedSentence(item, actor?.name.split(' ')[0] ?? 'Someone');
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={styles.item}
                    title={item.kind === 'comment' && item.detail ? item.detail : sentence}
                    onClick={() => open(item)}
                  >
                    <Avatar user={actor ?? UNKNOWN} size="sm" />
                    <span className={styles.text}>
                      <span className={styles.sentence}>{sentence}</span>
                      <span className={styles.time}>{timeAgo(item.createdAt)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}

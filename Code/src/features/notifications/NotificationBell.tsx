import { Bell, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePanels } from '@/app/panels';
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  Popover,
  Skeleton,
} from '@/components/ui';
import type { NotificationView, User } from '@/domain/types';
import { useUserMap } from '@/features/org/api';
import { timeAgo } from '@/lib/dates';
import { useMarkNotificationsRead, useNotifications } from './api';
import { notificationParts } from './text';
import styles from './NotificationBell.module.css';

const MAX_BADGE = 9;
const UNKNOWN: Pick<User, 'name' | 'color'> = { name: 'Someone', color: 'sky' };

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

/** The TopBar bell: an unread badge, and a popover list of recent notifications. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data, error, isPending, refetch } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const users = useUserMap();
  const { openTask, openFile } = usePanels();
  const navigate = useNavigate();

  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];
  const today = items.filter((n) => isToday(n.createdAt));
  const earlier = items.filter((n) => !isToday(n.createdAt));

  const openItem = (n: NotificationView) => {
    if (!n.readAt) markRead.mutate({ ids: [n.id] });
    setOpen(false);
    if (n.taskId) openTask(n.taskId);
    else if (n.fileId) openFile(n.fileId);
    else if (n.folderId) navigate(`/files/folders/${n.folderId}`);
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="end"
      label="Notifications"
      padding="none"
      trigger={
        <IconButton
          noTooltip
          label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          icon={
            <span className={styles.bell}>
              <Bell />
              {unread > 0 && (
                <span data-component="CountBadge" className={styles.badge} aria-hidden>
                  {unread > MAX_BADGE ? `${MAX_BADGE}+` : unread}
                </span>
              )}
            </span>
          }
        />
      }
    >
      <div data-component="NotificationList" className={styles.panel}>
        <header className={styles.header}>
          <h2 className={styles.title}>Notifications</h2>
          <Button
            size="sm"
            variant="ghost"
            icon={<CheckCheck />}
            disabled={unread === 0}
            onClick={() => markRead.mutate({ all: true })}
          >
            Mark all as read
          </Button>
        </header>
        <div className={styles.scroll}>
          {isPending && (
            <div className={styles.pad}>
              <Skeleton lines={4} />
            </div>
          )}
          {error && (
            <div className={styles.pad}>
              <ErrorState error={error} onRetry={refetch} compact />
            </div>
          )}
          {data && items.length === 0 && (
            <EmptyState
              icon={<Bell />}
              title="You're all caught up"
              description="Comments, mentions, assignments and shares show up here."
            />
          )}
          <Group title="Today" items={today} onOpen={openItem} users={users} />
          <Group title="Earlier" items={earlier} onOpen={openItem} users={users} />
        </div>
      </div>
    </Popover>
  );
}

function Group({
  title,
  items,
  users,
  onOpen,
}: {
  title: string;
  items: NotificationView[];
  users: Map<string, User>;
  onOpen: (n: NotificationView) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className={styles.group}>
      <h3 className={styles.groupTitle}>{title}</h3>
      <ul className={styles.list}>
        {items.map((n) => {
          const actor = users.get(n.actorId);
          const { before, after } = notificationParts(n);
          return (
            <li key={n.id}>
              <button
                type="button"
                className={styles.item}
                data-unread={!n.readAt}
                onClick={() => onOpen(n)}
              >
                <Avatar user={actor ?? UNKNOWN} size="md" />
                <span className={styles.text}>
                  <span className={styles.sentence}>
                    <strong className={styles.actor}>
                      {actor?.name.split(' ')[0] ?? 'Someone'}
                    </strong>{' '}
                    {before} <strong className={styles.subject}>{n.title}</strong>
                    {after && ` ${after}`}
                  </span>
                  {n.excerpt && <span className={styles.excerpt}>{n.excerpt}</span>}
                  <span className={styles.time}>{timeAgo(n.createdAt)}</span>
                </span>
                {!n.readAt && <span className={styles.dot} role="img" aria-label="Unread" />}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

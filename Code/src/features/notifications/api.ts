import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/api/endpoints';
import { keys } from '@/api/keys';
import type { NotificationList } from '@/domain/types';

/** How often the bell checks for new notifications. */
export const NOTIFICATION_POLL_MS = 30_000;

export const useNotifications = (limit = 20) =>
  useQuery({
    queryKey: keys.notifications,
    queryFn: () => notificationsApi.list(limit),
    refetchInterval: NOTIFICATION_POLL_MS,
  });

/**
 * Mark notifications read, patching the cached list first so the badge drops at once.
 * Keep this hook in a component that stays mounted (the bell, not its popover): TanStack
 * Query drops per-call callbacks when the calling component unmounts, so everything that
 * must happen afterwards lives here, in the hook's own callbacks.
 */
export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markRead,
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: keys.notifications });
      const previous = qc.getQueryData<NotificationList>(keys.notifications);
      if (previous) {
        const readAt = new Date().toISOString();
        let changed = 0;
        const items = previous.items.map((n) => {
          if (n.readAt || !('all' in input || input.ids.includes(n.id))) return n;
          changed += 1;
          return { ...n, readAt };
        });
        qc.setQueryData<NotificationList>(keys.notifications, {
          items,
          unreadCount: 'all' in input ? 0 : Math.max(0, previous.unreadCount - changed),
        });
      }
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(keys.notifications, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.notifications }),
  });
}

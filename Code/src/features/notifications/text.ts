import type { NotificationView } from '@/domain/types';
import { STATUS_LABEL } from '@/features/tasks/meta';

/** A notification as words around its subject: "<actor> {before} <title> {after}". */
export function notificationParts(n: NotificationView): { before: string; after: string } {
  switch (n.kind) {
    case 'assigned':
      return { before: 'assigned you', after: '' };
    case 'commented':
      return { before: 'commented on', after: '' };
    case 'mentioned':
      return { before: 'mentioned you in', after: '' };
    case 'status_changed':
      return { before: 'moved', after: `to ${n.status ? STATUS_LABEL[n.status] : 'a new status'}` };
    case 'shared':
      return { before: 'shared', after: 'with you' };
  }
}

import type { ActivityFeedItem, TaskPriority, TaskStatus } from '@/domain/types';
import { PRIORITY_LABEL, STATUS_LABEL } from '@/features/tasks/meta';
import { formatDue } from '@/lib/dates';

/** One line for the feed: "Theo moved Write microcopy for shipping options to In review". */
export function feedSentence(item: ActivityFeedItem, actorFirstName: string): string {
  const who = actorFirstName;
  const { title, detail } = item;
  switch (item.kind) {
    case 'created':
      return `${who} created ${title}`;
    case 'status':
      return `${who} moved ${title} to ${STATUS_LABEL[detail as TaskStatus] ?? detail ?? 'a new status'}`;
    case 'assignee':
      return detail ? `${who} assigned ${title} to ${detail}` : `${who} unassigned ${title}`;
    case 'priority':
      return `${who} set ${title} to ${PRIORITY_LABEL[detail as TaskPriority] ?? detail ?? 'a new'} priority`;
    case 'due':
      return detail
        ? `${who} set ${title} due ${formatDue(detail)}`
        : `${who} removed the due date from ${title}`;
    case 'title':
      return `${who} renamed ${title}`;
    case 'file_linked':
      return `${who} linked ${detail ?? 'a file'} to ${title}`;
    case 'file_unlinked':
      return `${who} unlinked ${detail ?? 'a file'} from ${title}`;
    case 'comment':
      return `${who} commented on ${title}`;
    case 'file_edited':
      return `${who} edited ${title}`;
  }
}

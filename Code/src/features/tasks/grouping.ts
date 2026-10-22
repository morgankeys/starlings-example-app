import type { Task, TaskStatus } from '@/domain/types';
import { daysUntil } from '@/lib/dates';
import type { TaskGroup } from './TaskGroups';
import { STATUS_LABEL } from './meta';

/** Home and My tasks: Overdue · Today · This week · Later · No date (open tasks only). */
export function groupByDue(tasks: Task[]): TaskGroup[] {
  const open = tasks.filter((t) => t.status !== 'done');
  const by = (pred: (d: number | null) => boolean) =>
    open.filter((t) => pred(t.dueDate ? daysUntil(t.dueDate) : null));
  return [
    { id: 'overdue', label: 'Overdue', tone: 'danger', tasks: by((d) => d !== null && d < 0) },
    { id: 'today', label: 'Today', tone: 'warning', tasks: by((d) => d === 0) },
    { id: 'week', label: 'This week', tasks: by((d) => d !== null && d > 0 && d <= 6) },
    { id: 'later', label: 'Later', tasks: by((d) => d !== null && d > 6) },
    { id: 'none', label: 'No due date', tasks: by((d) => d === null) },
  ];
}

const STATUS_ORDER: TaskStatus[] = ['in_progress', 'in_review', 'todo', 'done'];

export function groupByStatus(tasks: Task[]): TaskGroup[] {
  return STATUS_ORDER.map((s) => ({
    id: s,
    label: STATUS_LABEL[s],
    tasks: tasks.filter((t) => t.status === s),
    collapsed: s === 'done',
  }));
}

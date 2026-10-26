import { CalendarDays, CornerDownLeft, Plus } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useSession } from '@/app/session';
import { Avatar, useToast } from '@/components/ui';
import type { NewTask } from '@/domain/types';
import { formatDue } from '@/lib/dates';
import { useActiveUsers } from '@/features/org/api';
import { useCreateTask } from './api';
import { PRIORITY_LABEL } from './meta';
import { parseQuickAdd } from '@/lib/quickAdd';
import { PriorityIcon } from './TaskIcons';
import styles from './QuickAdd.module.css';

/** One-line task entry: "Draft hero copy tomorrow !high @maya". Assigns to you unless @someone. */
export function QuickAdd({
  defaults,
  placeholder,
}: {
  defaults?: Partial<NewTask>;
  placeholder?: string;
}) {
  const { user } = useSession();
  const { data: users } = useActiveUsers();
  const create = useCreateTask();
  const toast = useToast();
  const [value, setValue] = useState('');
  const parsed = useMemo(() => parseQuickAdd(value, users), [value, users]);
  const assignee = users.find(
    (u) => u.id === (parsed.assigneeId ?? defaults?.assigneeId ?? user.id),
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!parsed.title) return;
    create.mutate(
      {
        ...defaults,
        title: parsed.title,
        priority: parsed.priority ?? defaults?.priority,
        dueDate: parsed.dueDate ?? defaults?.dueDate,
        assigneeId: parsed.assigneeId ?? defaults?.assigneeId ?? user.id,
      },
      {
        onSuccess: (task) => {
          setValue('');
          toast({ title: 'Task added', description: task.title, tone: 'success' });
        },
        onError: (err) =>
          toast({ title: "Couldn't add the task", description: err.message, tone: 'danger' }),
      },
    );
  };

  const hasTokens = parsed.priority || parsed.dueDate || parsed.assigneeId;

  return (
    <form className={styles.form} onSubmit={onSubmit} data-component="QuickAdd">
      <div className={styles.field}>
        <Plus className={styles.plus} aria-hidden />
        <input
          className={styles.input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder ?? 'Add a task… try “Send recap tomorrow !high @leo”'}
          aria-label="Add a task"
          disabled={create.isPending}
        />
        {value && (
          <span className={styles.hint}>
            <CornerDownLeft aria-hidden /> to add
          </span>
        )}
      </div>
      {value && hasTokens && (
        <div className={styles.preview} aria-live="polite">
          {parsed.dueDate && (
            <span className={styles.token}>
              <CalendarDays aria-hidden />
              {formatDue(parsed.dueDate)}
            </span>
          )}
          {parsed.priority && (
            <span className={styles.token}>
              <PriorityIcon priority={parsed.priority} />
              {PRIORITY_LABEL[parsed.priority]}
            </span>
          )}
          {assignee && parsed.assigneeId && (
            <span className={styles.token}>
              <Avatar user={assignee} size="xs" />
              {assignee.name}
            </span>
          )}
        </div>
      )}
    </form>
  );
}

import {
  CalendarDays,
  CheckCircle2,
  FolderKanban,
  SignalHigh,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { Button, DatePicker } from '@/components/ui';
import type { Task } from '@/domain/types';
import { AssigneeMenu, PriorityMenu, ProjectMenu, StatusMenu } from './pickers';
import { useBulkTaskActions } from './useBulkTaskActions';
import styles from './BulkActionBar.module.css';

/**
 * Actions for the selected tasks, pinned to the bottom of the content area. Every action
 * applies to all selected tasks in one request; pickers start with no value checked.
 */
export function BulkActionBar({ tasks, onClear }: { tasks: Task[]; onClear: () => void }) {
  const { update, remove } = useBulkTaskActions();
  return (
    <div
      className={styles.bar}
      role="toolbar"
      aria-label="Bulk actions for selected tasks"
      data-component="BulkActionBar"
    >
      <span className={styles.count} aria-live="polite">
        {tasks.length} selected
      </span>
      <StatusMenu
        value={null}
        onChange={(status) => update(tasks, { status })}
        trigger={
          <Button size="sm" icon={<CheckCircle2 />}>
            Status
          </Button>
        }
      />
      <AssigneeMenu
        value={undefined}
        onChange={(assigneeId) => update(tasks, { assigneeId })}
        trigger={
          <Button size="sm" icon={<UserRound />}>
            Assignee
          </Button>
        }
      />
      <PriorityMenu
        value={null}
        onChange={(priority) => update(tasks, { priority })}
        trigger={
          <Button size="sm" icon={<SignalHigh />}>
            Priority
          </Button>
        }
      />
      <DatePicker
        value={null}
        onChange={(dueDate) => update(tasks, { dueDate })}
        trigger={
          <Button size="sm" icon={<CalendarDays />}>
            Due date
          </Button>
        }
      />
      <ProjectMenu
        value={undefined}
        onChange={(projectId) => update(tasks, { projectId })}
        trigger={
          <Button size="sm" icon={<FolderKanban />}>
            Move to project
          </Button>
        }
      />
      <span className={styles.spacer} />
      <Button
        size="sm"
        variant="danger"
        icon={<Trash2 />}
        onClick={() => {
          void remove(tasks);
          onClear();
        }}
      >
        Delete
      </Button>
      <Button size="sm" variant="ghost" icon={<X />} onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}

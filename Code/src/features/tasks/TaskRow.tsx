import { MessageSquare, Paperclip } from 'lucide-react';
import { usePanels } from '@/app/panels';
import { Avatar, Dot, Tooltip } from '@/components/ui';
import type { Project, Task, User } from '@/domain/types';
import { dueState, formatDue } from '@/lib/dates';
import { STATUS_LABEL } from './meta';
import { PriorityIcon, StatusIcon } from './TaskIcons';
import { SelectBox } from './SelectBox';
import { useCompleteTask } from './useCompleteTask';
import styles from './TaskRow.module.css';

export interface TaskRowProps {
  task: Task;
  users: Map<string, User>;
  projects?: Map<string, Project>;
  /** Hide the assignee avatar (e.g. on "My tasks"). */
  hideAssignee?: boolean;
  hideProject?: boolean;
  /** Present when the list supports selecting rows. */
  selection?: {
    checked: boolean;
    /** Anything at all is selected, so every checkbox stays visible. */
    active: boolean;
    onToggle: (shift: boolean) => void;
  };
}

export function TaskRow({
  task,
  users,
  projects,
  hideAssignee,
  hideProject,
  selection,
}: TaskRowProps) {
  const { openTask, taskId } = usePanels();
  const complete = useCompleteTask();
  const assignee = task.assigneeId ? users.get(task.assigneeId) : undefined;
  const project = task.projectId ? projects?.get(task.projectId) : undefined;
  const done = task.status === 'done';
  const due = dueState(task.dueDate, done);

  return (
    <li
      className={styles.row}
      data-component="TaskRow"
      data-done={done}
      data-selected={taskId === task.id}
      data-checked={selection?.checked ?? false}
      data-selecting={selection?.active ?? false}
    >
      {selection && (
        <span className={styles.select}>
          <SelectBox
            label={`Select “${task.title}”`}
            checked={selection.checked}
            onChange={(_checked, shift) => selection.onToggle(shift)}
          />
        </span>
      )}
      <Tooltip content={done ? 'Mark as not done' : 'Mark as done'}>
        <button
          type="button"
          className={styles.check}
          onClick={() => complete(task)}
          aria-label={done ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`}
          aria-pressed={done}
        >
          <StatusIcon status={task.status} title={false} />
        </button>
      </Tooltip>
      <button type="button" className={styles.main} onClick={() => openTask(task.id)}>
        <span className={styles.title}>{task.title}</span>
        <span className={styles.meta}>
          <span className={styles.srOnly}>{STATUS_LABEL[task.status]}.</span>
          {project && !hideProject && (
            <span className={styles.metaItem}>
              <Dot color={project.color} />
              {project.name}
            </span>
          )}
          {task.fileIds.length > 0 && (
            <span className={styles.metaItem} aria-label={`${task.fileIds.length} linked files`}>
              <Paperclip aria-hidden />
              {task.fileIds.length}
            </span>
          )}
          {task.commentCount > 0 && (
            <span className={styles.metaItem} aria-label={`${task.commentCount} comments`}>
              <MessageSquare aria-hidden />
              {task.commentCount}
            </span>
          )}
          {task.labels.map((l) => (
            <span key={l} className={styles.label}>
              {l}
            </span>
          ))}
        </span>
      </button>
      <span className={styles.due} data-due={due}>
        {task.dueDate ? formatDue(task.dueDate) : ''}
      </span>
      <PriorityIcon priority={task.priority} />
      {!hideAssignee && (
        <span className={styles.assignee}>
          {assignee ? (
            <Avatar user={assignee} size="sm" tooltip />
          ) : (
            <span className={styles.unassigned} aria-label="Unassigned" />
          )}
        </span>
      )}
    </li>
  );
}

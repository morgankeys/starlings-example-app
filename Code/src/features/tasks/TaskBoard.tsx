import { ArrowRightLeft, MessageSquare, Paperclip, Plus } from 'lucide-react';
import { useMemo, useState, type DragEvent } from 'react';
import { usePanels } from '@/app/panels';
import { useShellActions } from '@/app/shellActions';
import { Avatar, Dot, IconButton, useToast } from '@/components/ui';
import type { NewTask, Project, Task, TaskStatus, User } from '@/domain/types';
import { useProjects, useUserMap } from '@/features/org/api';
import { dueState, formatDue } from '@/lib/dates';
import { useUpdateTask } from './api';
import { boardColumns } from './grouping';
import { StatusMenu } from './pickers';
import { PriorityIcon, StatusIcon } from './TaskIcons';
import styles from './TaskBoard.module.css';

export interface TaskBoardProps {
  tasks: Task[];
  /** Status filter; when non-empty only these columns are shown. */
  statuses?: TaskStatus[];
  /** False hides the Done column (e.g. the Person page). */
  includeDone?: boolean;
  quickAddDefaults?: Partial<NewTask>;
  canAdd?: boolean;
  hideAssignee?: boolean;
  hideProject?: boolean;
}

/**
 * Kanban view of tasks, one column per status. Cards move between columns by native
 * drag and drop, or with the "Move to…" menu on each card (keyboard and touch).
 */
export function TaskBoard({
  tasks,
  statuses,
  includeDone = true,
  quickAddDefaults,
  canAdd = true,
  hideAssignee,
  hideProject,
}: TaskBoardProps) {
  const { newTask } = useShellActions();
  const toast = useToast();
  const update = useUpdateTask();
  const users = useUserMap();
  const { data: projectList } = useProjects();
  const projects = useMemo(
    () => new Map<string, Project>((projectList ?? []).map((p) => [p.id, p])),
    [projectList],
  );
  const columns = useMemo(
    () => boardColumns(tasks, { statuses, includeDone }),
    [tasks, statuses, includeDone],
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<TaskStatus | null>(null);

  const move = (id: string, status: TaskStatus) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === status) return;
    update.mutate(
      { id, patch: { status } },
      {
        onError: (err) =>
          toast({
            title: "Couldn't move the task",
            description: err instanceof Error ? err.message : undefined,
            tone: 'danger',
          }),
      },
    );
  };

  const endDrag = () => {
    setDragId(null);
    setOverStatus(null);
  };

  return (
    <div className={styles.board} data-component="TaskBoard">
      {columns.map((col) => (
        <section
          key={col.status}
          className={styles.column}
          data-status={col.status}
          data-drop-target={dragId !== null && overStatus === col.status}
          aria-label={col.label}
          onDragOver={(e: DragEvent) => {
            if (dragId === null) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (overStatus !== col.status) setOverStatus(col.status);
          }}
          onDragLeave={(e: DragEvent) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOverStatus(null);
          }}
          onDrop={(e: DragEvent) => {
            e.preventDefault();
            const id = e.dataTransfer.getData('text/plain') || dragId;
            endDrag();
            if (id) move(id, col.status);
          }}
        >
          <header className={styles.header}>
            <StatusIcon status={col.status} title={false} />
            <h3 className={styles.heading}>{col.label}</h3>
            <span className={styles.count} aria-label={`${col.tasks.length} tasks`}>
              {col.tasks.length}
            </span>
            <span className={styles.spacer} />
            {canAdd && (
              <IconButton
                label={`Add task to ${col.label}`}
                icon={<Plus />}
                size="sm"
                onClick={() => newTask({ ...quickAddDefaults, status: col.status })}
              />
            )}
          </header>
          {col.tasks.length === 0 ? (
            <p className={styles.empty}>No tasks</p>
          ) : (
            <ul className={styles.list}>
              {col.tasks.map((t) => (
                <BoardCard
                  key={t.id}
                  task={t}
                  users={users}
                  projects={projects}
                  hideAssignee={hideAssignee}
                  hideProject={hideProject}
                  dragging={dragId === t.id}
                  onMove={(s) => move(t.id, s)}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', t.id);
                    e.dataTransfer.effectAllowed = 'move';
                    setDragId(t.id);
                  }}
                  onDragEnd={endDrag}
                />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function BoardCard({
  task,
  users,
  projects,
  hideAssignee,
  hideProject,
  dragging,
  onMove,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  users: Map<string, User>;
  projects: Map<string, Project>;
  hideAssignee?: boolean;
  hideProject?: boolean;
  dragging: boolean;
  onMove: (status: TaskStatus) => void;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
}) {
  const { openTask, taskId } = usePanels();
  const assignee = task.assigneeId ? users.get(task.assigneeId) : undefined;
  const project = task.projectId ? projects.get(task.projectId) : undefined;
  const due = dueState(task.dueDate, task.status === 'done');

  return (
    <li
      className={styles.card}
      data-component="TaskBoardCard"
      data-selected={taskId === task.id}
      data-dragging={dragging}
      data-done={task.status === 'done'}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <button type="button" className={styles.main} onClick={() => openTask(task.id)}>
        <span className={styles.title}>{task.title}</span>
        <span className={styles.meta}>
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
      <div className={styles.footer}>
        <span className={styles.due} data-due={due}>
          {task.dueDate ? formatDue(task.dueDate) : ''}
        </span>
        <PriorityIcon priority={task.priority} />
        {!hideAssignee &&
          (assignee ? (
            <Avatar user={assignee} size="sm" tooltip />
          ) : (
            <span className={styles.unassigned} aria-label="Unassigned" />
          ))}
      </div>
      <div className={styles.move}>
        <StatusMenu
          value={task.status}
          onChange={onMove}
          trigger={
            <IconButton
              label={`Move “${task.title}”`}
              icon={<ArrowRightLeft />}
              size="sm"
              noTooltip
            />
          }
        />
      </div>
    </li>
  );
}

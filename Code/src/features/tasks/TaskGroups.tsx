import { ChevronDown } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import type { Project, Task } from '@/domain/types';
import { useProjects, useUserMap } from '@/features/org/api';
import { TaskRow } from './TaskRow';
import styles from './TaskGroups.module.css';

export interface TaskGroup {
  id: string;
  label: string;
  icon?: ReactNode;
  tone?: 'danger' | 'warning' | 'default';
  tasks: Task[];
  /** Start collapsed (e.g. Done, Later). */
  collapsed?: boolean;
}

/** Collapsible groups of task rows. Empty groups are skipped. */
export function TaskGroups({
  groups,
  hideAssignee,
  hideProject,
}: {
  groups: TaskGroup[];
  hideAssignee?: boolean;
  hideProject?: boolean;
}) {
  const users = useUserMap();
  const { data: projectList } = useProjects();
  const projects = useMemo(
    () => new Map<string, Project>((projectList ?? []).map((p) => [p.id, p])),
    [projectList],
  );
  return (
    <div className={styles.groups}>
      {groups
        .filter((g) => g.tasks.length)
        .map((g) => (
          <Group key={g.id} group={g}>
            {g.tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                users={users}
                projects={projects}
                hideAssignee={hideAssignee}
                hideProject={hideProject}
              />
            ))}
          </Group>
        ))}
    </div>
  );
}

function Group({ group, children }: { group: TaskGroup; children: ReactNode }) {
  const [open, setOpen] = useState(!group.collapsed);
  const id = `group-${group.id}`;
  return (
    <section className={styles.group} data-tone={group.tone ?? 'default'}>
      <h3 className={styles.heading}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronDown className={styles.chevron} aria-hidden />
          {group.icon}
          <span>{group.label}</span>
          <span className={styles.count}>{group.tasks.length}</span>
        </button>
      </h3>
      {open && (
        <ul id={id} className={styles.list}>
          {children}
        </ul>
      )}
    </section>
  );
}

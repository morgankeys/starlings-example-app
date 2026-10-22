import { ChevronDown } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import type { Project, Task } from '@/domain/types';
import { useProjects, useUserMap } from '@/features/org/api';
import { SelectBox } from './SelectBox';
import { TaskRow } from './TaskRow';
import type { TaskSelection } from './useTaskSelection';
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

/**
 * Collapsible groups of task rows. Empty groups are skipped. With a `selection`, rows and
 * group headers get checkboxes; Shift-click ranges follow the rows that are on screen.
 */
export function TaskGroups({
  groups,
  hideAssignee,
  hideProject,
  selection,
}: {
  groups: TaskGroup[];
  hideAssignee?: boolean;
  hideProject?: boolean;
  selection?: TaskSelection;
}) {
  const users = useUserMap();
  const { data: projectList } = useProjects();
  const projects = useMemo(
    () => new Map<string, Project>((projectList ?? []).map((p) => [p.id, p])),
    [projectList],
  );
  // Open/closed lives here, not in each group, so we know which rows are on screen.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const shown = groups.filter((g) => g.tasks.length);
  const isOpen = (g: TaskGroup) => toggled[g.id] ?? !g.collapsed;
  const visibleIds = shown.filter(isOpen).flatMap((g) => g.tasks.map((t) => t.id));
  const picked = selection?.selected;
  return (
    <div className={styles.groups}>
      {shown.map((g) => {
        const ids = g.tasks.map((t) => t.id);
        const count = picked ? ids.filter((id) => picked.has(id)).length : 0;
        return (
          <Group
            key={g.id}
            group={g}
            open={isOpen(g)}
            onToggle={() => setToggled((prev) => ({ ...prev, [g.id]: !isOpen(g) }))}
            select={
              selection && {
                checked: count === ids.length,
                indeterminate: count > 0 && count < ids.length,
                onChange: (on) => selection.setMany(ids, on),
              }
            }
          >
            {g.tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                users={users}
                projects={projects}
                hideAssignee={hideAssignee}
                hideProject={hideProject}
                selection={
                  selection &&
                  picked && {
                    checked: picked.has(t.id),
                    active: picked.size > 0,
                    onToggle: (shift) => selection.toggle(t.id, shift, visibleIds),
                  }
                }
              />
            ))}
          </Group>
        );
      })}
    </div>
  );
}

function Group({
  group,
  open,
  onToggle,
  select,
  children,
}: {
  group: TaskGroup;
  open: boolean;
  onToggle: () => void;
  select?: { checked: boolean; indeterminate: boolean; onChange: (on: boolean) => void };
  children: ReactNode;
}) {
  const id = `group-${group.id}`;
  return (
    <section className={styles.group} data-tone={group.tone ?? 'default'}>
      <h3 className={styles.heading}>
        {select && (
          <SelectBox
            label={`Select all in ${group.label}`}
            checked={select.checked}
            indeterminate={select.indeterminate}
            onChange={(on) => select.onChange(on)}
          />
        )}
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
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

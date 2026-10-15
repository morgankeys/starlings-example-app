import {
  CalendarClock,
  CheckCircle2,
  Columns3,
  Filter,
  List,
  Search,
  SignalHigh,
  X,
} from 'lucide-react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  Menu,
  MenuOption,
  SegmentedControl,
  Skeleton,
} from '@/components/ui';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type NewTask,
  type TaskFilters,
  type TaskPriority,
  type TaskStatus,
} from '@/domain/types';
import { useTasks } from './api';
import { groupByDue, groupByStatus } from './grouping';
import { PRIORITY_LABEL, STATUS_LABEL } from './meta';
import { QuickAdd } from './QuickAdd';
import { PriorityIcon, StatusIcon } from './TaskIcons';
import { TaskBoard } from './TaskBoard';
import { TaskGroups } from './TaskGroups';
import styles from './TasksView.module.css';

type Due = NonNullable<TaskFilters['due']>;
const DUE_LABEL: Record<Due, string> = {
  overdue: 'Overdue',
  today: 'Due today',
  week: 'Due this week',
  none: 'No due date',
};

const toggle = <T,>(list: T[], v: T) =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

/**
 * A filterable, grouped task list. Filters live in the URL (?status=…&priority=…&due=…&q=…&group=…)
 * so a filtered view can be shared.
 */
export function TasksView({
  base,
  quickAddDefaults,
  hideAssignee,
  hideProject,
  defaultGroup = 'status',
  emptyTitle = 'No tasks here yet',
  canAdd = true,
}: {
  /** Fixed filters for this view (assignee, team, project). */
  base: TaskFilters;
  quickAddDefaults?: Partial<NewTask>;
  hideAssignee?: boolean;
  hideProject?: boolean;
  defaultGroup?: 'status' | 'due';
  emptyTitle?: string;
  canAdd?: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const status = (params.get('status')?.split(',').filter(Boolean) ?? []) as TaskStatus[];
  const priority = (params.get('priority')?.split(',').filter(Boolean) ?? []) as TaskPriority[];
  const due = (params.get('due') as Due | null) ?? undefined;
  const q = params.get('q') ?? '';
  const group = (params.get('group') as 'status' | 'due' | null) ?? defaultGroup;
  const layout: 'list' | 'board' = params.get('view') === 'board' ? 'board' : 'list';

  const setParam = (key: string, value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  const filters: TaskFilters = { ...base, status, priority, due, q: q || undefined };
  const { data, error, isPending, refetch } = useTasks(filters);
  const groups = useMemo(
    () => (group === 'due' ? groupByDue(data ?? []) : groupByStatus(data ?? [])),
    [data, group],
  );
  const active = status.length + priority.length + (due ? 1 : 0) + (q ? 1 : 0);
  const clear = () =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        ['status', 'priority', 'due', 'q'].forEach((k) => next.delete(k));
        return next;
      },
      { replace: true },
    );

  return (
    <div className={styles.view} data-component="TasksView">
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Search aria-hidden />
          <Input
            value={q}
            onChange={(e) => setParam('q', e.target.value || null)}
            placeholder="Filter tasks"
            aria-label="Filter tasks"
          />
        </div>
        <Menu
          label="Status"
          trigger={
            <Button size="sm" icon={<CheckCircle2 />} data-active={status.length > 0}>
              {status.length ? status.map((s) => STATUS_LABEL[s]).join(', ') : 'Status'}
            </Button>
          }
        >
          {TASK_STATUSES.map((s) => (
            <MenuOption
              key={s}
              icon={<StatusIcon status={s} title={false} />}
              checked={status.includes(s)}
              onSelect={() => setParam('status', toggle(status, s).join(',') || null)}
            >
              {STATUS_LABEL[s]}
            </MenuOption>
          ))}
        </Menu>
        <Menu
          label="Priority"
          trigger={
            <Button size="sm" icon={<SignalHigh />}>
              {priority.length ? priority.map((p) => PRIORITY_LABEL[p]).join(', ') : 'Priority'}
            </Button>
          }
        >
          {TASK_PRIORITIES.map((p) => (
            <MenuOption
              key={p}
              icon={<PriorityIcon priority={p} />}
              checked={priority.includes(p)}
              onSelect={() => setParam('priority', toggle(priority, p).join(',') || null)}
            >
              {PRIORITY_LABEL[p]}
            </MenuOption>
          ))}
        </Menu>
        <Menu
          label="Due"
          trigger={
            <Button size="sm" icon={<CalendarClock />}>
              {due ? DUE_LABEL[due] : 'Due'}
            </Button>
          }
        >
          {(Object.keys(DUE_LABEL) as Due[]).map((d) => (
            <MenuOption
              key={d}
              checked={due === d}
              onSelect={() => setParam('due', due === d ? null : d)}
            >
              {DUE_LABEL[d]}
            </MenuOption>
          ))}
        </Menu>
        {active > 0 && (
          <Button size="sm" variant="ghost" icon={<X />} onClick={clear}>
            Clear {active > 1 ? `${active} filters` : 'filter'}
          </Button>
        )}
        <div className={styles.spacer} />
        {layout === 'list' && (
          <SegmentedControl
            label="Group by"
            value={group}
            onChange={(g) => setParam('group', g === defaultGroup ? null : g)}
            options={[
              { value: 'status', label: 'By status' },
              { value: 'due', label: 'By due date' },
            ]}
          />
        )}
        <SegmentedControl
          label="Layout"
          value={layout}
          onChange={(l) => setParam('view', l === 'board' ? 'board' : null)}
          options={[
            { value: 'list', label: 'List', icon: <List />, iconOnly: true },
            { value: 'board', label: 'Board', icon: <Columns3 />, iconOnly: true },
          ]}
        />
      </div>

      {canAdd && <QuickAdd defaults={quickAddDefaults} />}

      {isPending && <Skeleton lines={8} size="lg" />}
      {error && <ErrorState error={error} onRetry={refetch} />}
      {data && data.length === 0 && (
        <EmptyState
          icon={active ? <Filter /> : <CheckCircle2 />}
          title={active ? 'No tasks match these filters' : emptyTitle}
          description={
            active
              ? 'Try removing a filter.'
              : canAdd
                ? 'Add one above. Type a task and press Enter.'
                : undefined
          }
          action={active ? <Button onClick={clear}>Clear filters</Button> : undefined}
        />
      )}
      {data && data.length > 0 && layout === 'board' && (
        <TaskBoard
          tasks={data}
          statuses={status}
          includeDone={base.includeDone !== false}
          quickAddDefaults={quickAddDefaults}
          canAdd={canAdd}
          hideAssignee={hideAssignee}
          hideProject={hideProject}
        />
      )}
      {data && data.length > 0 && layout === 'list' && (
        <TaskGroups groups={groups} hideAssignee={hideAssignee} hideProject={hideProject} />
      )}
    </div>
  );
}

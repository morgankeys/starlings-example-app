import { CalendarDays, Check, ListPlus, UserRound } from 'lucide-react';
import { useState } from 'react';
import { usePanels } from '@/app/panels';
import { Avatar, Badge, Button, Card, DatePicker, Input, useToast } from '@/components/ui';
import type { SuggestedTask } from '@/domain/types';
import { useUserMap } from '@/features/org/api';
import { AssigneeMenu } from '@/features/tasks/pickers';
import { formatDue } from '@/lib/dates';
import type { ActionsResult } from './AssistantProvider';
import { useCreateSuggestedTasks, type CreatedTask } from './useCreateSuggestedTasks';
import styles from './SuggestedTasks.module.css';

interface RowState {
  title: string;
  assigneeId: string | null;
  dueDate: string | null;
  selected: boolean;
}

const plural = (n: number) => `${n} ${n === 1 ? 'task' : 'tasks'}`;

/**
 * The confirmation step for tasks Ask Birdy proposes. Nothing is created until the user
 * reviews the rows (edit the title, assignee or due date, untick what they don't want) and
 * presses Create. Afterwards the card collapses into a confirmation with chips that open
 * each new task, and a toast offers Undo.
 */
export function SuggestedTasks({
  items,
  resolution,
  onResolve,
}: {
  items: SuggestedTask[];
  /** The stored outcome, if the user already acted on these suggestions. */
  resolution?: ActionsResult;
  /** Called when the user creates, undoes or dismisses. */
  onResolve?: (result: ActionsResult) => void;
}) {
  const { openTask } = usePanels();
  const toast = useToast();
  const users = useUserMap();
  const { create, undo } = useCreateSuggestedTasks();

  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      items.map((s) => [
        s.key,
        {
          title: s.title,
          assigneeId: s.assigneeId,
          dueDate: s.dueDate,
          selected: !s.existingTaskId,
        },
      ]),
    ),
  );
  // Tasks made so far. A retry after a partial failure must not create these again.
  const [created, setCreated] = useState<CreatedTask[]>([]);
  const [busy, setBusy] = useState(false);
  const [localResult, setLocalResult] = useState<ActionsResult | undefined>();
  const result = resolution ?? localResult;

  const finish = (r: ActionsResult) => {
    setLocalResult(r);
    onResolve?.(r);
  };
  const edit = (key: string, patch: Partial<RowState>) =>
    setRows((all) => ({ ...all, [key]: { ...all[key], ...patch } }));

  const isDone = (s: SuggestedTask) => created.some((c) => c.key === s.key);
  const isOpen = (s: SuggestedTask) => !s.existingTaskId && !isDone(s);
  const chosen = items.filter((s) => isOpen(s) && rows[s.key].selected && rows[s.key].title.trim());

  const submit = async () => {
    setBusy(true);
    const outcome = await create(
      chosen.map((s) => ({
        key: s.key,
        task: {
          title: rows[s.key].title.trim(),
          description: s.description,
          assigneeId: rows[s.key].assigneeId,
          dueDate: rows[s.key].dueDate,
          priority: s.priority,
          projectId: s.projectId,
          teamId: s.teamId,
          fileIds: s.fileIds,
        },
      })),
    );
    setBusy(false);
    const all = [...created, ...outcome.created];
    setCreated(all);

    if (outcome.failed.length) {
      toast({
        title: `Couldn't create ${plural(outcome.failed.length)}`,
        description: outcome.error?.message,
        tone: 'danger',
      });
      return; // The failed rows stay selected so the user can try again.
    }
    finish({ kind: 'created', tasks: all.map(({ id, title }) => ({ id, title })) });
    toast({
      title: `Created ${plural(all.length)}`,
      tone: 'success',
      action: {
        label: 'Undo',
        onClick: async () => {
          if (await undo(all)) finish({ kind: 'undone', count: all.length });
        },
      },
    });
  };

  if (result?.kind === 'dismissed') return null;

  const status =
    result?.kind === 'created'
      ? `Created ${plural(result.tasks.length)}`
      : result?.kind === 'undone'
        ? `Removed ${plural(result.count)}`
        : '';

  return (
    <div data-component="SuggestedTasks" aria-busy={busy || undefined}>
      <Card title="Suggested tasks" icon={<ListPlus aria-hidden />}>
        {/* Always mounted, so the confirmation is announced when its text appears. */}
        <p className={styles.status} role="status" aria-live="polite" data-kind={result?.kind}>
          {status && <Check aria-hidden />}
          {status}
        </p>

        {result?.kind === 'created' && (
          <ul className={styles.chips}>
            {result.tasks.map((t) => (
              <li key={t.id}>
                <button type="button" className={styles.chip} onClick={() => openTask(t.id)}>
                  <span className={styles.chipText}>{t.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {!result && (
          <>
            <ul className={styles.list}>
              {items.map((s) => {
                const row = rows[s.key];
                const madeTask = created.find((c) => c.key === s.key);
                const trackedId = s.existingTaskId ?? madeTask?.id ?? null;
                const assignee = row.assigneeId ? users.get(row.assigneeId) : undefined;
                return (
                  <li
                    key={s.key}
                    className={styles.row}
                    data-state={s.existingTaskId ? 'tracked' : madeTask ? 'created' : 'new'}
                  >
                    <span className={styles.check}>
                      <input
                        type="checkbox"
                        aria-label={`Create task: ${row.title}`}
                        checked={isOpen(s) && row.selected}
                        disabled={!isOpen(s) || busy}
                        onChange={(e) => edit(s.key, { selected: e.target.checked })}
                      />
                    </span>
                    <div className={styles.body}>
                      {isOpen(s) ? (
                        <Input
                          aria-label="Task title"
                          aria-invalid={row.selected && !row.title.trim() ? true : undefined}
                          value={row.title}
                          disabled={busy}
                          onChange={(e) => edit(s.key, { title: e.target.value })}
                        />
                      ) : (
                        <p className={styles.fixedTitle}>{row.title}</p>
                      )}
                      {trackedId ? (
                        <div className={styles.meta}>
                          <Badge tone={madeTask ? 'success' : 'info'} icon={<Check aria-hidden />}>
                            {madeTask ? 'Created' : 'Already tracked'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Open task: ${row.title}`}
                            onClick={() => openTask(trackedId)}
                          >
                            Open task
                          </Button>
                        </div>
                      ) : (
                        <div className={styles.meta}>
                          <AssigneeMenu
                            value={row.assigneeId}
                            teamId={s.teamId}
                            onChange={(assigneeId) => edit(s.key, { assigneeId })}
                            trigger={
                              <button
                                type="button"
                                className={styles.picker}
                                disabled={busy}
                                aria-label={`Assignee for ${row.title}: ${assignee?.name ?? 'Unassigned'}`}
                              >
                                {assignee ? (
                                  <Avatar user={assignee} size="xs" />
                                ) : (
                                  <UserRound aria-hidden />
                                )}
                                {assignee ? assignee.name.split(' ')[0] : 'Unassigned'}
                              </button>
                            }
                          />
                          <DatePicker
                            value={row.dueDate}
                            onChange={(dueDate) => edit(s.key, { dueDate })}
                            disabled={busy}
                            trigger={
                              <button
                                type="button"
                                className={styles.picker}
                                disabled={busy}
                                aria-label={`Due date for ${row.title}: ${formatDue(row.dueDate)}`}
                              >
                                <CalendarDays aria-hidden />
                                {formatDue(row.dueDate)}
                              </button>
                            }
                          />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className={styles.footer}>
              <Button variant="ghost" disabled={busy} onClick={() => finish({ kind: 'dismissed' })}>
                Dismiss
              </Button>
              <Button variant="ai" disabled={chosen.length === 0} loading={busy} onClick={submit}>
                {chosen.length ? `Create ${plural(chosen.length)}` : 'Create tasks'}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { tasksApi } from '@/api/endpoints';
import { useToast } from '@/components/ui';
import type { BulkTaskResult, BulkTaskUpdate, Task, TaskPatch } from '@/domain/types';
import { invalidateTaskViews, patchTaskCaches } from './api';

type Toast = ReturnType<typeof useToast>;

const plural = (n: number) => `${n} task${n === 1 ? '' : 's'}`;

/** The current value of every field a patch touches, so the patch can be reversed. */
function previousPatch(task: Task, patch: TaskPatch): TaskPatch {
  const prev: Record<string, unknown> = {};
  for (const key of Object.keys(patch) as Array<keyof TaskPatch>) prev[key] = task[key];
  return prev as TaskPatch;
}

function summary(verb: string, res: BulkTaskResult) {
  const skipped = res.skipped.length;
  return {
    title: `${verb} ${plural(res.updated.length)}${skipped ? ` · ${skipped} skipped` : ''}`,
    description: skipped ? [...new Set(res.skipped.map((s) => s.reason))].join('. ') : undefined,
  };
}

/**
 * Apply per-task patches optimistically, send one bulk request, and toast with Undo.
 *
 * These are plain functions over the query client and API, not component-scoped
 * mutations: the toast and its Undo have to outlive the bar (and the rows) that started
 * them, and TanStack Query drops per-call callbacks once the caller unmounts.
 */
async function bulkUpdate(
  qc: QueryClient,
  toast: Toast,
  updates: BulkTaskUpdate[],
  previous: BulkTaskUpdate[],
  isUndo = false,
) {
  await qc.cancelQueries({ queryKey: ['tasks'] });
  const rollbacks = updates.map((u) => patchTaskCaches(qc, u.id, u.patch));
  try {
    const res = await tasksApi.bulkUpdate(updates);
    // Skipped tasks were patched optimistically; put them back.
    const updatedIds = new Set(res.updated.map((t) => t.id));
    previous
      .filter((p) => !updatedIds.has(p.id))
      .forEach((p) => patchTaskCaches(qc, p.id, p.patch));
    if (isUndo) {
      toast({ ...summary('Restored', res), tone: res.skipped.length ? 'default' : 'success' });
    } else {
      const undo = previous.filter((p) => updatedIds.has(p.id));
      toast({
        ...summary('Updated', res),
        tone: 'success',
        action: undo.length
          ? { label: 'Undo', onClick: () => void bulkUpdate(qc, toast, undo, updates, true) }
          : undefined,
      });
    }
  } catch (err) {
    rollbacks.reverse().forEach((rollback) => rollback());
    toast({
      title: isUndo ? "Couldn't undo the changes" : "Couldn't update the tasks",
      description: (err as Error).message,
      tone: 'danger',
    });
  } finally {
    invalidateTaskViews(qc);
  }
}

async function bulkDelete(qc: QueryClient, toast: Toast, ids: string[]) {
  await qc.cancelQueries({ queryKey: ['tasks'] });
  const gone = new Set(ids);
  const lists = qc.getQueriesData<Task[]>({ queryKey: ['tasks', 'list'] });
  lists.forEach(([key, data]) => {
    if (data)
      qc.setQueryData<Task[]>(
        key,
        data.filter((t) => !gone.has(t.id)),
      );
  });
  try {
    const res = await tasksApi.bulkRemove(ids);
    const deleted = res.updated.map((t) => t.id);
    toast({
      ...summary('Deleted', res),
      tone: 'success',
      action: deleted.length
        ? {
            label: 'Undo',
            onClick: () => {
              tasksApi
                .bulkRestore(deleted)
                .catch((err: Error) =>
                  toast({
                    title: "Couldn't restore the tasks",
                    description: err.message,
                    tone: 'danger',
                  }),
                )
                .finally(() => invalidateTaskViews(qc));
            },
          }
        : undefined,
    });
  } catch (err) {
    lists.forEach(([key, data]) => qc.setQueryData<Task[]>(key, data));
    toast({
      title: "Couldn't delete the tasks",
      description: (err as Error).message,
      tone: 'danger',
    });
  } finally {
    invalidateTaskViews(qc);
  }
}

/** Bulk actions over a set of tasks (see `BulkActionBar`). */
export function useBulkTaskActions() {
  const qc = useQueryClient();
  const toast = useToast();

  const update = useCallback(
    (tasks: Task[], patch: TaskPatch) =>
      bulkUpdate(
        qc,
        toast,
        tasks.map((t) => ({ id: t.id, patch })),
        tasks.map((t) => ({ id: t.id, patch: previousPatch(t, patch) })),
      ),
    [qc, toast],
  );

  const remove = useCallback(
    (tasks: Task[]) =>
      bulkDelete(
        qc,
        toast,
        tasks.map((t) => t.id),
      ),
    [qc, toast],
  );

  return { update, remove };
}

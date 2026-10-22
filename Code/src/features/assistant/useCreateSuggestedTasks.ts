import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { tasksApi } from '@/api/endpoints';
import { keys } from '@/api/keys';
import { useToast } from '@/components/ui';
import type { NewTask } from '@/domain/types';
import { invalidateTaskViews } from '@/features/tasks/api';

export interface CreatedTask {
  /** The suggestion's key, so the card can tell which rows are done. */
  key: string;
  id: string;
  title: string;
}

/**
 * Create and undo suggested tasks through the API and the query client rather than a
 * component-scoped mutation. The chat card collapses as soon as it is done, and closing the
 * Ask Birdy panel unmounts it, yet the Undo toast has to keep working. Same pattern as
 * `useCompleteTask`.
 */
export function useCreateSuggestedTasks() {
  const qc = useQueryClient();
  const toast = useToast();

  /** Create one at a time, in order. Failures don't stop the rest, so a retry only repeats them. */
  const create = useCallback(
    async (inputs: Array<{ key: string; task: NewTask }>) => {
      const created: CreatedTask[] = [];
      const failed: string[] = [];
      let error: Error | null = null;
      for (const { key, task } of inputs) {
        try {
          const made = await tasksApi.create(task);
          qc.setQueryData(keys.task(made.id), made);
          created.push({ key, id: made.id, title: made.title });
        } catch (err) {
          failed.push(key);
          error = err as Error;
        }
      }
      if (created.length) invalidateTaskViews(qc);
      return { created, failed, error };
    },
    [qc],
  );

  /** Delete tasks created by `create`. Returns whether every one was removed. */
  const undo = useCallback(
    async (tasks: Array<Pick<CreatedTask, 'id'>>) => {
      const results = await Promise.allSettled(tasks.map((t) => tasksApi.remove(t.id)));
      invalidateTaskViews(qc);
      const failures = results.filter((r) => r.status === 'rejected').length;
      if (failures) {
        toast({
          title: "Couldn't undo everything",
          description: `${failures} of ${tasks.length} tasks are still there.`,
          tone: 'danger',
        });
      }
      return failures === 0;
    },
    [qc, toast],
  );

  return { create, undo };
}

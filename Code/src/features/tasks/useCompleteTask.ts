import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { tasksApi } from '@/api/endpoints';
import { useToast } from '@/components/ui';
import type { Task, TaskStatus } from '@/domain/types';
import { invalidateTaskViews, patchTaskCaches } from './api';

/**
 * Toggle done with an undo toast. Works through the query client rather than a
 * component-scoped mutation: a completed row usually disappears from its list
 * straight away, and the toast and undo have to outlive it.
 */
export function useCompleteTask() {
  const qc = useQueryClient();
  const toast = useToast();

  const setStatus = useCallback(
    async (id: string, status: TaskStatus) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const rollback = patchTaskCaches(qc, id, { status });
      try {
        await tasksApi.update(id, { status });
      } catch (err) {
        rollback();
        toast({
          title: "Couldn't update the task",
          description: (err as Error).message,
          tone: 'danger',
        });
      } finally {
        invalidateTaskViews(qc);
      }
    },
    [qc, toast],
  );

  return useCallback(
    (task: Pick<Task, 'id' | 'title' | 'status'>) => {
      const previous = task.status;
      const done = previous !== 'done';
      setStatus(task.id, done ? 'done' : 'todo');
      if (done) {
        toast({
          title: 'Task completed',
          description: task.title,
          tone: 'success',
          action: { label: 'Undo', onClick: () => setStatus(task.id, previous) },
        });
      }
    },
    [setStatus, toast],
  );
}

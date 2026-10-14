import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/api/endpoints';
import { keys } from '@/api/keys';
import type { NewTask, Task, TaskDetail, TaskFilters, TaskPatch } from '@/domain/types';

export const useTasks = (filters: TaskFilters = {}, enabled = true) =>
  useQuery({ queryKey: keys.tasks(filters), queryFn: () => tasksApi.list(filters), enabled });

export const useTask = (id: string | null) =>
  useQuery({ queryKey: keys.task(id ?? ''), queryFn: () => tasksApi.get(id!), enabled: !!id });

export function invalidateTaskViews(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: keys.allTasks });
  qc.invalidateQueries({ queryKey: ['teams'] });
  qc.invalidateQueries({ queryKey: keys.projects });
  qc.invalidateQueries({ queryKey: keys.focus });
  qc.invalidateQueries({ queryKey: keys.allFiles });
}

/** Patch a task in every cached list and its detail. Returns a function that undoes it. */
export function patchTaskCaches(qc: QueryClient, id: string, patch: TaskPatch): () => void {
  const lists = qc.getQueriesData<Task[]>({ queryKey: ['tasks', 'list'] });
  const detail = qc.getQueryData<TaskDetail>(keys.task(id));
  for (const [key, data] of lists) {
    if (data)
      qc.setQueryData<Task[]>(
        key,
        data.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      );
  }
  if (detail) qc.setQueryData<TaskDetail>(keys.task(id), { ...detail, ...patch });
  return () => {
    lists.forEach(([key, data]) => qc.setQueryData<Task[]>(key, data));
    if (detail) qc.setQueryData(keys.task(id), detail);
  };
}

/** Update a task, optimistically patching every cached list and the detail. */
export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TaskPatch }) => tasksApi.update(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: keys.allTasks });
      return { rollback: patchTaskCaches(qc, id, patch) };
    },
    onError: (_err, _vars, ctx) => ctx?.rollback(),
    onSuccess: (task) => qc.setQueryData(keys.task(task.id), task),
    onSettled: () => invalidateTaskViews(qc),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewTask) => tasksApi.create(input),
    onSuccess: (task) => {
      qc.setQueryData(keys.task(task.id), task);
      invalidateTaskViews(qc);
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.remove(id),
    onSettled: () => invalidateTaskViews(qc),
  });
}

export function useRestoreTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.restore(id),
    onSettled: () => invalidateTaskViews(qc),
  });
}

export function useTaskComment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => tasksApi.comment(id, body),
    onSuccess: (task) => {
      qc.setQueryData(keys.task(id), task);
      qc.invalidateQueries({ queryKey: ['tasks', 'list'] });
    },
  });
}

export function useTaskFiles(id: string) {
  const qc = useQueryClient();
  const onSuccess = (task: TaskDetail) => {
    qc.setQueryData(keys.task(id), task);
    qc.invalidateQueries({ queryKey: ['tasks', 'list'] });
    qc.invalidateQueries({ queryKey: keys.allFiles });
  };
  return {
    link: useMutation({ mutationFn: (fileId: string) => tasksApi.linkFile(id, fileId), onSuccess }),
    unlink: useMutation({
      mutationFn: (fileId: string) => tasksApi.unlinkFile(id, fileId),
      onSuccess,
    }),
  };
}

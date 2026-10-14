import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { http } from 'msw';
import type {
  ActivityEvent,
  ActivityKind,
  NewTask,
  TaskDetail,
  TaskPatch,
  TaskPriority,
  TaskStatus,
  User,
} from '@/domain/types';
import { TASK_PRIORITIES, TASK_STATUSES } from '@/domain/types';
import { canEditTask, canSeeTask, fileAccess, toFile, toTask } from '../access';
import { newId } from '../db';
import type { Database, TaskRecord } from '../db-types';
import { API, badRequest, body, forbidden, notFound, now, route } from '../http';

const PRIORITY_ORDER: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function byDueThenPriority(a: TaskRecord, b: TaskRecord) {
  if (a.dueDate !== b.dueDate) {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  }
  return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
}

function findTask(db: Database, user: User, id: string): TaskRecord {
  const task = db.tasks.find((t) => t.id === id);
  if (!task || !canSeeTask(db, user, task)) throw notFound('Task');
  return task;
}

function detail(db: Database, user: User, task: TaskRecord): TaskDetail {
  const files = db.files
    .filter((f) => task.fileIds.includes(f.id) && !f.deletedAt)
    .map((f) => [f, fileAccess(db, user, f)] as const)
    .filter(([, access]) => access)
    .map(([f, access]) => toFile(db, user, f, access));
  return {
    ...toTask(db, task),
    comments: db.comments.filter((c) => c.taskId === task.id),
    activity: db.activity
      .filter((a) => a.taskId === task.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    files,
    canEdit: canEditTask(db, user, task),
  };
}

function log(db: Database, task: TaskRecord, actor: User, kind: ActivityKind, from: string | null = null, to: string | null = null) {
  const event: ActivityEvent = { id: newId('ev'), taskId: task.id, actorId: actor.id, kind, from, to, createdAt: now() };
  db.activity.push(event);
}

function validate(db: Database, input: TaskPatch) {
  if (input.title !== undefined && !input.title.trim()) throw badRequest('A task needs a title');
  if (input.status && !TASK_STATUSES.includes(input.status)) throw badRequest('Unknown status');
  if (input.priority && !TASK_PRIORITIES.includes(input.priority)) throw badRequest('Unknown priority');
  if (input.assigneeId && !db.users.some((u) => u.id === input.assigneeId)) throw badRequest('Unknown assignee');
  if (input.teamId && !db.teams.some((t) => t.id === input.teamId)) throw badRequest('Unknown team');
  if (input.projectId && !db.projects.some((p) => p.id === input.projectId)) throw badRequest('Unknown project');
  if (input.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) throw badRequest('Due date must be YYYY-MM-DD');
}

export const taskHandlers = [
  http.get(
    `${API}/tasks`,
    route(({ db, user, url }) => {
      const p = url.searchParams;
      const today = format(new Date(), 'yyyy-MM-dd');
      const assignee = p.get('assignee');
      const statuses = p.get('status')?.split(',').filter(Boolean) as TaskStatus[] | undefined;
      const priorities = p.get('priority')?.split(',').filter(Boolean) as TaskPriority[] | undefined;
      const due = p.get('due');
      const q = p.get('q')?.toLowerCase().trim();
      const includeDone = p.get('includeDone') !== 'false';

      return db.tasks
        .filter((t) => canSeeTask(db, user, t))
        .filter((t) => {
          if (assignee === 'me' && t.assigneeId !== user.id) return false;
          if (assignee === 'unassigned' && t.assigneeId !== null) return false;
          if (assignee && !['me', 'unassigned'].includes(assignee) && t.assigneeId !== assignee) return false;
          if (p.get('team') && t.teamId !== p.get('team')) return false;
          if (p.get('project') && t.projectId !== p.get('project')) return false;
          if (statuses?.length && !statuses.includes(t.status)) return false;
          if (!includeDone && t.status === 'done') return false;
          if (priorities?.length && !priorities.includes(t.priority)) return false;
          if (due === 'none' && t.dueDate) return false;
          if (due && due !== 'none') {
            if (!t.dueDate || t.status === 'done') return false;
            const d = differenceInCalendarDays(parseISO(t.dueDate), parseISO(today));
            if (due === 'overdue' && d >= 0) return false;
            if (due === 'today' && d !== 0) return false;
            if (due === 'week' && d > 6) return false;
          }
          if (q && !`${t.title} ${t.description} ${t.labels.join(' ')}`.toLowerCase().includes(q)) return false;
          return true;
        })
        .sort(byDueThenPriority)
        .map((t) => toTask(db, t));
    }),
  ),

  http.get<{ id: string }>(
    `${API}/tasks/:id`,
    route(({ db, user, params }) => detail(db, user, findTask(db, user, params.id))),
  ),

  http.post(
    `${API}/tasks`,
    route(async ({ db, user, request }) => {
      if (user.role === 'guest') throw forbidden('Guests cannot create tasks');
      const input = await body<NewTask>(request);
      validate(db, input);
      if (!input.title?.trim()) throw badRequest('A task needs a title');
      const timestamp = now();
      const status = input.status ?? 'todo';
      const task: TaskRecord = {
        id: newId('t'),
        title: input.title.trim(),
        description: input.description?.trim() ?? '',
        status,
        priority: input.priority ?? 'medium',
        assigneeId: input.assigneeId ?? null,
        teamId: input.teamId ?? null,
        projectId: input.projectId ?? null,
        dueDate: input.dueDate ?? null,
        labels: input.labels ?? [],
        fileIds: input.fileIds ?? [],
        createdById: user.id,
        createdAt: timestamp,
        updatedAt: timestamp,
        completedAt: status === 'done' ? timestamp : null,
        deletedAt: null,
      };
      db.tasks.push(task);
      log(db, task, user, 'created');
      return detail(db, user, task);
    }),
  ),

  http.patch<{ id: string }>(
    `${API}/tasks/:id`,
    route(async ({ db, user, params, request }) => {
      const task = findTask(db, user, params.id);
      if (!canEditTask(db, user, task)) throw forbidden('You can only update tasks assigned to you');
      const patch = await body<TaskPatch>(request);
      validate(db, patch);
      const tracked: Array<[keyof TaskPatch, ActivityKind]> = [
        ['title', 'title'],
        ['status', 'status'],
        ['assigneeId', 'assignee'],
        ['priority', 'priority'],
        ['dueDate', 'due'],
      ];
      for (const [field, kind] of tracked) {
        if (patch[field] !== undefined && patch[field] !== task[field]) {
          log(db, task, user, kind, (task[field] as string | null) ?? null, (patch[field] as string | null) ?? null);
        }
      }
      if (patch.status && patch.status !== task.status) {
        task.completedAt = patch.status === 'done' ? now() : null;
      }
      Object.assign(task, patch, { updatedAt: now() });
      if (patch.title) task.title = patch.title.trim();
      return detail(db, user, task);
    }),
  ),

  http.delete<{ id: string }>(
    `${API}/tasks/:id`,
    route(({ db, user, params }) => {
      const task = findTask(db, user, params.id);
      if (user.role === 'guest') throw forbidden('Guests cannot delete tasks');
      task.deletedAt = now();
      return null;
    }),
  ),

  http.post<{ id: string }>(
    `${API}/tasks/:id/restore`,
    route(({ db, user, params }) => {
      const task = db.tasks.find((t) => t.id === params.id);
      if (!task) throw notFound('Task');
      task.deletedAt = null;
      return detail(db, user, task);
    }),
  ),

  http.post<{ id: string }>(
    `${API}/tasks/:id/comments`,
    route(async ({ db, user, params, request }) => {
      const task = findTask(db, user, params.id);
      const { body: text } = await body<{ body: string }>(request);
      if (!text?.trim()) throw badRequest('Write a comment first');
      db.comments.push({ id: newId('cm'), taskId: task.id, authorId: user.id, body: text.trim(), createdAt: now() });
      task.updatedAt = now();
      return detail(db, user, task);
    }),
  ),

  http.post<{ id: string }>(
    `${API}/tasks/:id/files`,
    route(async ({ db, user, params, request }) => {
      const task = findTask(db, user, params.id);
      if (!canEditTask(db, user, task)) throw forbidden();
      const { fileId } = await body<{ fileId: string }>(request);
      const file = db.files.find((f) => f.id === fileId && !f.deletedAt);
      if (!file || !fileAccess(db, user, file)) throw notFound('File');
      if (!task.fileIds.includes(file.id)) {
        task.fileIds.push(file.id);
        log(db, task, user, 'file_linked', null, file.name);
      }
      return detail(db, user, task);
    }),
  ),

  http.delete<{ id: string; fileId: string }>(
    `${API}/tasks/:id/files/:fileId`,
    route(({ db, user, params }) => {
      const task = findTask(db, user, params.id);
      if (!canEditTask(db, user, task)) throw forbidden();
      const file = db.files.find((f) => f.id === params.fileId);
      task.fileIds = task.fileIds.filter((id) => id !== params.fileId);
      log(db, task, user, 'file_unlinked', file?.name ?? null, null);
      return detail(db, user, task);
    }),
  ),
];

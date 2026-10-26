import { http } from 'msw';
import type { BulkTaskResult, BulkTaskUpdate, ID, User } from '@/domain/types';
import { canEditTask, canSeeTask, toTask } from '../access';
import type { Database, TaskRecord } from '../db-types';
import { API, badRequest, body, now, route } from '../http';
import { applyPatch, validate } from './tasks';

const NOT_FOUND = 'Task not found';
const CANNOT_EDIT = 'You can only update tasks assigned to you';
const MAX_BULK = 500;

function result(db: Database, updated: TaskRecord[], skipped: BulkTaskResult['skipped']) {
  return { updated: updated.map((t) => toTask(db, t)), skipped };
}

/** Patch many tasks at once. Tasks the user can't see or edit are skipped, not errors. */
export function bulkUpdateTasks(
  db: Database,
  user: User,
  updates: BulkTaskUpdate[],
): BulkTaskResult {
  if (!Array.isArray(updates) || updates.length > MAX_BULK)
    throw badRequest('Send up to 500 updates');
  for (const u of updates) {
    if (!u || typeof u.id !== 'string' || !u.patch)
      throw badRequest('Each update needs an id and a patch');
    validate(db, u.patch);
  }
  const updated: TaskRecord[] = [];
  const skipped: BulkTaskResult['skipped'] = [];
  for (const { id, patch } of updates) {
    const task = db.tasks.find((t) => t.id === id);
    if (!task || !canSeeTask(db, user, task)) skipped.push({ id, reason: NOT_FOUND });
    else if (!canEditTask(db, user, task)) skipped.push({ id, reason: CANNOT_EDIT });
    else {
      applyPatch(db, user, task, patch);
      updated.push(task);
    }
  }
  return result(db, updated, skipped);
}

function checkIds(ids: unknown) {
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string') || ids.length > MAX_BULK)
    throw badRequest('Send up to 500 task ids');
}

/** Soft-delete many tasks. Guests can't delete; tasks the user can't edit are skipped. */
export function bulkDeleteTasks(db: Database, user: User, ids: ID[]): BulkTaskResult {
  checkIds(ids);
  const updated: TaskRecord[] = [];
  const skipped: BulkTaskResult['skipped'] = [];
  for (const id of ids) {
    const task = db.tasks.find((t) => t.id === id);
    if (!task || !canSeeTask(db, user, task)) skipped.push({ id, reason: NOT_FOUND });
    else if (user.role === 'guest') skipped.push({ id, reason: 'Guests cannot delete tasks' });
    else if (!canEditTask(db, user, task)) skipped.push({ id, reason: CANNOT_EDIT });
    else {
      task.deletedAt = now();
      updated.push(task);
    }
  }
  return result(db, updated, skipped);
}

/** Undo a bulk delete. Only deleted tasks the user could see and edit come back. */
export function bulkRestoreTasks(db: Database, user: User, ids: ID[]): BulkTaskResult {
  checkIds(ids);
  const updated: TaskRecord[] = [];
  const skipped: BulkTaskResult['skipped'] = [];
  for (const id of ids) {
    const task = db.tasks.find((t) => t.id === id);
    const live = task && { ...task, deletedAt: null };
    if (!task || !live || !canSeeTask(db, user, live)) skipped.push({ id, reason: NOT_FOUND });
    else if (!canEditTask(db, user, live)) skipped.push({ id, reason: CANNOT_EDIT });
    else if (!task.deletedAt) skipped.push({ id, reason: "Task isn't deleted" });
    else {
      task.deletedAt = null;
      task.updatedAt = now();
      updated.push(task);
    }
  }
  return result(db, updated, skipped);
}

export const bulkTaskHandlers = [
  http.post(
    `${API}/tasks/bulk`,
    route(async ({ db, user, request }) => {
      const { updates } = await body<{ updates: BulkTaskUpdate[] }>(request);
      return bulkUpdateTasks(db, user, updates);
    }),
  ),
  http.post(
    `${API}/tasks/bulk-delete`,
    route(async ({ db, user, request }) => {
      const { ids } = await body<{ ids: ID[] }>(request);
      return bulkDeleteTasks(db, user, ids);
    }),
  ),
  http.post(
    `${API}/tasks/bulk-restore`,
    route(async ({ db, user, request }) => {
      const { ids } = await body<{ ids: ID[] }>(request);
      return bulkRestoreTasks(db, user, ids);
    }),
  ),
];

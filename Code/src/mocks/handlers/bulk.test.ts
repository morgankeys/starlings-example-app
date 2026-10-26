import { describe, expect, it } from 'vitest';
import { HttpError } from '../http';
import { buildDatabase } from '../seed';
import { bulkDeleteTasks, bulkRestoreTasks, bulkUpdateTasks } from './bulk';

const fresh = () => {
  const db = buildDatabase(new Date());
  const user = (id: string) => db.users.find((u) => u.id === id)!;
  return { db, user };
};

describe('bulk task update', () => {
  it('patches each task and logs activity per task', () => {
    const { db, user } = fresh();
    const maya = user('u_maya');
    const ids = db.tasks
      .filter((t) => t.priority !== 'urgent')
      .slice(0, 3)
      .map((t) => t.id);
    const before = db.activity.length;
    const res = bulkUpdateTasks(
      db,
      maya,
      ids.map((id) => ({ id, patch: { priority: 'urgent' } })),
    );
    expect(res.updated.map((t) => t.id)).toEqual(ids);
    expect(res.skipped).toEqual([]);
    expect(res.updated.every((t) => t.priority === 'urgent')).toBe(true);
    const added = db.activity.slice(before);
    expect(added).toHaveLength(3);
    expect(added.every((e) => e.kind === 'priority' && e.actorId === 'u_maya')).toBe(true);
    expect(added.map((e) => e.taskId)).toEqual(ids);
  });

  it('restores per-task values from per-task patches', () => {
    const { db, user } = fresh();
    const [a, b] = db.tasks.filter((t) => t.status !== 'done' && t.priority !== 'low');
    const undo = [a, b].map((t) => ({ id: t.id, patch: { priority: t.priority } }));
    bulkUpdateTasks(
      db,
      user('u_maya'),
      [a, b].map((t) => ({ id: t.id, patch: { priority: 'low' } })),
    );
    const res = bulkUpdateTasks(db, user('u_maya'), undo);
    expect(res.updated.map((t) => t.priority)).toEqual(undo.map((u) => u.patch.priority));
  });

  it('skips tasks a guest cannot edit instead of failing the request', () => {
    const { db, user } = fresh();
    const elena = user('u_elena');
    const mine = db.tasks.find((t) => t.assigneeId === 'u_elena' && !t.deletedAt)!;
    const hidden = db.tasks.find((t) => t.assigneeId !== 'u_elena' && t.createdById !== 'u_elena')!;
    const before = db.activity.length;
    const wasUrgent = mine.priority === 'urgent';
    const res = bulkUpdateTasks(db, elena, [
      { id: mine.id, patch: { priority: 'urgent' } },
      { id: hidden.id, patch: { priority: 'urgent' } },
      { id: 'nope', patch: { priority: 'urgent' } },
    ]);
    expect(res.updated.map((t) => t.id)).toEqual([mine.id]);
    expect(res.skipped.map((s) => s.id)).toEqual([hidden.id, 'nope']);
    expect(hidden.priority).not.toBe('urgent');
    expect(db.activity.length - before).toBe(wasUrgent ? 0 : 1);
  });

  it('skips visible tasks a guest created but is not assigned to', () => {
    const { db, user } = fresh();
    const task = db.tasks[0];
    task.createdById = 'u_elena';
    task.assigneeId = 'u_maya';
    const res = bulkUpdateTasks(db, user('u_elena'), [{ id: task.id, patch: { status: 'done' } }]);
    expect(res.updated).toEqual([]);
    expect(res.skipped).toHaveLength(1);
    expect(task.status).not.toBe('done');
  });

  it('rejects an invalid patch without changing anything', () => {
    const { db, user } = fresh();
    const [a, b] = db.tasks;
    const priority = a.priority;
    expect(() =>
      bulkUpdateTasks(db, user('u_maya'), [
        { id: a.id, patch: { priority: 'urgent' } },
        { id: b.id, patch: { status: 'bogus' as never } },
      ]),
    ).toThrow(HttpError);
    expect(a.priority).toBe(priority);
  });
});

describe('bulk delete and restore', () => {
  it('soft deletes and restores', () => {
    const { db, user } = fresh();
    const ids = db.tasks.slice(0, 2).map((t) => t.id);
    const del = bulkDeleteTasks(db, user('u_maya'), ids);
    expect(del.updated).toHaveLength(2);
    expect(db.tasks.filter((t) => ids.includes(t.id)).every((t) => t.deletedAt)).toBe(true);
    const back = bulkRestoreTasks(db, user('u_maya'), ids);
    expect(back.updated).toHaveLength(2);
    expect(db.tasks.filter((t) => ids.includes(t.id)).every((t) => !t.deletedAt)).toBe(true);
  });

  it('skips everything for guests and unknown ids', () => {
    const { db, user } = fresh();
    const mine = db.tasks.find((t) => t.assigneeId === 'u_elena')!;
    const res = bulkDeleteTasks(db, user('u_elena'), [mine.id, 'nope']);
    expect(res.updated).toEqual([]);
    expect(res.skipped.map((s) => s.id)).toEqual([mine.id, 'nope']);
    expect(mine.deletedAt).toBeNull();
  });

  it("doesn't let a guest restore a task they could not edit", () => {
    const { db, user } = fresh();
    const other = db.tasks.find((t) => t.assigneeId !== 'u_elena' && t.createdById !== 'u_elena')!;
    other.deletedAt = new Date().toISOString();
    const res = bulkRestoreTasks(db, user('u_elena'), [other.id]);
    expect(res.updated).toEqual([]);
    expect(other.deletedAt).not.toBeNull();
  });
});

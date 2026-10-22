import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { NotificationList, TaskDetail } from '@/domain/types';
import { getDb, resetDb, save } from './db';
import type { Database } from './db-types';
import { handlers } from './handlers';
import { notifyAssigned, notifyComment, notifyShared, notifyStatusChanged } from './notify';
import { buildDatabase } from './seed';

// ---- The notify helpers on a fresh seed ------------------------------------------------

describe('notification generation', () => {
  let db: Database;
  const user = (id: string) => db.users.find((u) => u.id === id)!;
  const task = (id: string) => db.tasks.find((t) => t.id === id)!;

  beforeEach(() => {
    db = buildDatabase(new Date());
  });

  it('notifies the new assignee, but never the person who assigned themselves', () => {
    const t = { ...task('t_unassigned_grid'), assigneeId: 'u_leo' };
    const made = notifyAssigned(db, user('u_maya'), t);
    expect(made).toHaveLength(1);
    expect(made[0]).toMatchObject({
      userId: 'u_leo',
      kind: 'assigned',
      actorId: 'u_maya',
      taskId: t.id,
      readAt: null,
    });

    expect(notifyAssigned(db, user('u_leo'), t)).toEqual([]);
    expect(notifyAssigned(db, user('u_maya'), { ...t, assigneeId: null })).toEqual([]);
  });

  it('tells the assignee and the creator about a comment, once each', () => {
    // t_apple_pay: created by Maya, assigned to Leo.
    const made = notifyComment(db, user('u_theo'), task('t_apple_pay'), {
      id: 'cm_x',
      body: 'Looks good to me.',
    });
    expect(made.map((n) => [n.userId, n.kind]).sort()).toEqual([
      ['u_leo', 'commented'],
      ['u_maya', 'commented'],
    ]);
    expect(made[0]).toMatchObject({ commentId: 'cm_x', excerpt: 'Looks good to me.' });

    // t_error_states: Maya is both assignee and creator, so she hears once.
    const solo = notifyComment(db, user('u_chloe'), task('t_error_states'), {
      id: 'cm_y',
      body: 'Thanks',
    });
    expect(solo).toHaveLength(1);
  });

  it('does not notify the commenter about their own comment', () => {
    const made = notifyComment(db, user('u_maya'), task('t_error_states'), {
      id: 'cm_z',
      body: 'On it',
    });
    expect(made).toEqual([]);
  });

  it('turns @FirstName into a mention, ignoring case and accents', () => {
    const made = notifyComment(db, user('u_maya'), task('t_apple_pay'), {
      id: 'cm_m',
      body: '@INES and @leo, can you look? (cc @nobody)',
    });
    const byUser = Object.fromEntries(made.map((n) => [n.userId, n.kind]));
    // Leo is the assignee but was named, so the mention wins over the plain comment.
    expect(byUser).toEqual({ u_ines: 'mentioned', u_leo: 'mentioned' });
  });

  it('skips the actor when they mention themselves', () => {
    const made = notifyComment(db, user('u_leo'), task('t_apple_pay'), {
      id: 'cm_s',
      body: '@Leo remember this',
    });
    expect(made.map((n) => n.userId)).toEqual(['u_maya']);
  });

  it('does not mention people in email addresses', () => {
    const made = notifyComment(db, user('u_leo'), task('t_unassigned_grid'), {
      id: 'cm_e',
      body: 'Send it to maya@meridianoutdoor.com',
    });
    expect(made.map((n) => n.userId)).toEqual(['u_raj']);
  });

  it('tells the creator when status changes, unless they changed it', () => {
    const made = notifyStatusChanged(db, user('u_leo'), task('t_apple_pay'), 'in_progress');
    expect(made).toHaveLength(1);
    expect(made[0]).toMatchObject({
      userId: 'u_maya',
      kind: 'status_changed',
      excerpt: 'in_progress',
    });
    expect(notifyStatusChanged(db, user('u_maya'), task('t_apple_pay'), 'done')).toEqual([]);
  });

  it('notifies each member of a team a file is shared with, and not the sharer or owner', () => {
    // Julia owns the launch plan and shares it with Operations.
    const file = db.files.find((f) => f.id === 'fl_launch_plan')!;
    const before = file.grants;
    const after = [
      ...before,
      { principalType: 'team' as const, principalId: 'tm_ops', level: 'view' as const },
    ];
    const made = notifyShared(db, user('u_julia'), { type: 'file', record: file }, before, after);
    expect(made.map((n) => n.userId).sort()).toEqual(['u_dana', 'u_hugo', 'u_priya']);
    expect(
      made.every((n) => n.kind === 'shared' && n.fileId === file.id && n.actorId === 'u_julia'),
    ).toBe(true);

    // Sharing with a team the sharer belongs to skips the sharer; the owner is skipped too.
    const toMarketing = [
      ...before,
      { principalType: 'team' as const, principalId: 'tm_marketing', level: 'view' as const },
    ];
    const inTeam = notifyShared(
      db,
      user('u_noah'),
      { type: 'file', record: file },
      before,
      toMarketing,
    );
    expect(inTeam.map((n) => n.userId).sort()).toEqual(['u_ava', 'u_marcus']);
  });

  it('tells a person reached by a user grant and a team grant only once, and only about new access', () => {
    const folder = db.folders.find((f) => f.id === 'fd_ops')!;
    const before = folder.grants; // Operations already has access
    const after = [
      ...before,
      { principalType: 'user' as const, principalId: 'u_leo', level: 'view' as const },
      { principalType: 'team' as const, principalId: 'tm_design', level: 'view' as const },
    ];
    const made = notifyShared(
      db,
      user('u_dana'),
      { type: 'folder', record: folder },
      before,
      after,
    );
    const leo = made.filter((n) => n.userId === 'u_leo');
    expect(leo).toHaveLength(1);
    expect(leo[0]).toMatchObject({ folderId: 'fd_ops' });
    expect(made.some((n) => ['u_hugo', 'u_priya'].includes(n.userId))).toBe(false);
  });

  it('does not tell a guest about a task they cannot see', () => {
    // Elena is a guest and has no part in this task, but is named in a comment on it.
    const made = notifyComment(db, user('u_maya'), task('t_apple_pay'), {
      id: 'cm_g',
      body: '@Elena FYI',
    });
    expect(made.map((n) => n.userId)).not.toContain('u_elena');
    // On her own task the same mention reaches her.
    const own = notifyComment(db, user('u_ava'), task('t_ridgeline_selects'), {
      id: 'cm_h',
      body: '@Elena FYI',
    });
    expect(own.map((n) => [n.userId, n.kind])).toEqual([['u_elena', 'mentioned']]);
  });
});

describe('seeded notifications', () => {
  it('gives Maya six, three unread, and other personas a few', () => {
    const db = buildDatabase(new Date());
    const maya = db.notifications.filter((n) => n.userId === 'u_maya');
    expect(maya).toHaveLength(6);
    expect(maya.filter((n) => !n.readAt)).toHaveLength(3);
    const others = new Set(db.notifications.map((n) => n.userId));
    expect(others.size).toBeGreaterThan(3);
    expect(db.notifications.every((n) => n.actorId !== n.userId)).toBe(true);
  });

  it('has none in an empty workspace', () => {
    expect(buildDatabase(new Date(), 'empty').notifications).toEqual([]);
  });
});

// ---- The endpoints, through the real handlers ------------------------------------------

const server = setupServer(...handlers);
const BASE = 'http://localhost:3000/api/v1';

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status}`);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

function signInAs(userId: string) {
  getDb().sessionUserId = userId;
  save();
}

describe('notification endpoints', () => {
  beforeAll(() => {
    localStorage.setItem('birdy.demo', JSON.stringify({ latency: 'none', failRequests: false }));
    server.listen({ onUnhandledRequest: 'error' });
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  beforeEach(() => resetDb('seed'));

  it("lists the signed-in user's notifications newest first, with titles and the unread count", async () => {
    signInAs('u_maya');
    const { items, unreadCount } = await call<NotificationList>('GET', '/notifications');
    expect(unreadCount).toBe(3);
    expect(items).toHaveLength(6);
    expect(items[0]).toMatchObject({
      kind: 'commented',
      actorId: 'u_theo',
      title: 'Finalize address form error states',
    });
    expect(items.map((n) => n.createdAt)).toEqual(
      [...items.map((n) => n.createdAt)].sort().reverse(),
    );
    const status = items.find((n) => n.kind === 'status_changed');
    expect(status).toMatchObject({ status: 'in_review' });
    expect(status).not.toHaveProperty('excerpt');
    expect(items.find((n) => n.kind === 'shared')).toMatchObject({
      folderId: 'fd_supplier',
      title: 'Supplier Portal',
    });
    expect(items.every((n) => !('userId' in n))).toBe(true);

    expect((await call<NotificationList>('GET', '/notifications?limit=2')).items).toHaveLength(2);
    // The count covers everything, not just the page.
    expect((await call<NotificationList>('GET', '/notifications?limit=2')).unreadCount).toBe(3);
  });

  it('marks some, then all, as read, for the caller only', async () => {
    signInAs('u_maya');
    const first = (await call<NotificationList>('GET', '/notifications')).items.find(
      (n) => !n.readAt,
    )!;
    expect(await call('POST', '/notifications/read', { ids: [first.id] })).toEqual({
      unreadCount: 2,
    });
    expect(await call('POST', '/notifications/read', { all: true })).toEqual({ unreadCount: 0 });

    signInAs('u_ben');
    expect((await call<NotificationList>('GET', '/notifications')).unreadCount).toBeGreaterThan(0);
    await expect(call('POST', '/notifications/read', {})).rejects.toThrow('400');
  });

  it('hides notifications about tasks and files the user can no longer see', async () => {
    signInAs('u_elena');
    const before = await call<NotificationList>('GET', '/notifications');
    expect(before.items.map((n) => n.kind).sort()).toEqual(['assigned', 'shared']);

    const db = getDb();
    db.tasks.find((t) => t.id === 't_ridgeline_selects')!.assigneeId = 'u_maya'; // no longer hers
    db.folders.find((f) => f.id === 'fd_cat_photo')!.grants = []; // access withdrawn
    save();
    const after = await call<NotificationList>('GET', '/notifications');
    expect(after.items).toEqual([]);
    expect(after.unreadCount).toBe(0);
  });

  it('notifies a mentioned person when a comment is posted, and the poster is left out', async () => {
    signInAs('u_maya');
    await call<TaskDetail>('POST', '/tasks/t_apple_pay/comments', {
      body: '@Leo can you check this?',
    });
    expect((await call<NotificationList>('GET', '/notifications')).items).toHaveLength(6); // not told of her own comment

    signInAs('u_leo');
    const { items } = await call<NotificationList>('GET', '/notifications');
    expect(items[0]).toMatchObject({
      kind: 'mentioned',
      actorId: 'u_maya',
      title: 'Add Apple Pay flow to checkout spec',
      excerpt: '@Leo can you check this?',
      readAt: null,
    });
    // One notification for the comment, even though Leo is also the assignee.
    expect(items.filter((n) => n.taskId === 't_apple_pay' && n.commentId)).toHaveLength(1);
  });

  it('notifies on assignment, status change and sharing through the real handlers', async () => {
    signInAs('u_maya');
    await call('PATCH', '/tasks/t_apple_pay', { assigneeId: 'u_ines' });
    await call('PUT', '/shares/file/fl_address_states', {
      generalAccess: 'restricted',
      grants: [{ principalType: 'team', principalId: 'tm_eng', level: 'view' }],
    });

    signInAs('u_ines');
    expect((await call<NotificationList>('GET', '/notifications')).items[0]).toMatchObject({
      kind: 'assigned',
      taskId: 't_apple_pay',
    });

    signInAs('u_kira');
    expect((await call<NotificationList>('GET', '/notifications')).items[0]).toMatchObject({
      kind: 'shared',
      fileId: 'fl_address_states',
      title: 'Address form states.png',
    });

    // Leo changes the status of a task Maya created: she hears about it. He does not.
    signInAs('u_leo');
    await call('PATCH', '/tasks/t_apple_pay', { status: 'in_review' });
    expect(
      (await call<NotificationList>('GET', '/notifications')).items.some(
        (n) => n.kind === 'status_changed',
      ),
    ).toBe(false);
    signInAs('u_maya');
    expect((await call<NotificationList>('GET', '/notifications')).items[0]).toMatchObject({
      kind: 'status_changed',
      status: 'in_review',
      actorId: 'u_leo',
    });
  });
});

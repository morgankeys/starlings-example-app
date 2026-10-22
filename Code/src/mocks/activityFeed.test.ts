import { beforeEach, describe, expect, it } from 'vitest';
import { canSeeTask, fileAccess } from './access';
import { buildActivityFeed } from './activityFeed';
import type { Database } from './db-types';
import { buildDatabase } from './seed';

let db: Database;
const user = (id: string) => db.users.find((u) => u.id === id)!;
const feed = (id: string, limit = 50) => buildActivityFeed(db, user(id), limit);

beforeEach(() => {
  db = buildDatabase(new Date());
});

describe('activity feed relevance', () => {
  it('is newest first, capped by the limit (15 by default)', () => {
    const items = feed('u_maya');
    expect(items.length).toBeGreaterThan(8);
    expect(items.map((i) => i.createdAt)).toEqual(
      [...items.map((i) => i.createdAt)].sort().reverse(),
    );
    expect(buildActivityFeed(db, user('u_maya'))).toHaveLength(15);
    expect(feed('u_maya', 3)).toHaveLength(3);
  });

  it("leaves out the user's own actions", () => {
    for (const id of ['u_maya', 'u_leo', 'u_chloe']) {
      expect(feed(id).every((i) => i.actorId !== id)).toBe(true);
    }
    // Maya's own comment on her task, and her own status events, are not in her feed.
    expect(feed('u_maya').some((i) => i.id === 'cm_2')).toBe(false);
    expect(feed('u_maya').some((i) => i.id === 'ev_t_design_review_status')).toBe(false);
  });

  it('includes comments on tasks assigned to or created by the user', () => {
    const maya = feed('u_maya');
    // t_error_states (hers): Theo and Chloé commented.
    const comments = maya.filter((i) => i.kind === 'comment' && i.taskId === 't_error_states');
    expect(comments.map((i) => i.actorId).sort()).toEqual(['u_chloe', 'u_theo']);
    expect(comments[0]).toMatchObject({ title: 'Finalize address form error states' });
    expect(comments.every((i) => i.detail)).toBe(true);
    // t_shipping_copy: created by Maya, assigned to Theo.
    expect(maya.some((i) => i.id === 'ev_t_shipping_copy_status' && i.detail === 'in_review')).toBe(
      true,
    );
  });

  it("includes tasks in the projects of the user's teams, and nothing from other teams' projects", () => {
    // Checkout Redesign belongs to Product Design. Nobody here is assigned t_safari_autocomplete.
    expect(feed('u_leo').some((i) => i.taskId === 't_safari_autocomplete')).toBe(true);
    // Hugo (Operations) has neither assigned nor created those, and Operations runs another project.
    const hugo = feed('u_hugo');
    expect(hugo.some((i) => i.taskId === 't_safari_autocomplete')).toBe(false);
    expect(hugo.some((i) => i.taskId === 't_error_states')).toBe(false);
    // But the Supplier Portal (Operations) tasks are in.
    expect(hugo.some((i) => i.taskId === 't_onboarding_steps')).toBe(true);
  });

  it('describes task events with the detail the sentence needs', () => {
    db.activity.push(
      {
        id: 'ev_a',
        taskId: 't_apple_pay',
        actorId: 'u_ines',
        kind: 'assignee',
        from: null,
        to: 'u_leo',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ev_b',
        taskId: 't_apple_pay',
        actorId: 'u_ines',
        kind: 'file_linked',
        from: null,
        to: 'Checkout spec v2.docx',
        createdAt: new Date().toISOString(),
      },
    );
    const items = feed('u_maya');
    expect(items.find((i) => i.id === 'ev_a')).toMatchObject({
      kind: 'assignee',
      detail: 'Leo Brandt',
      taskId: 't_apple_pay',
    });
    expect(items.find((i) => i.id === 'ev_b')).toMatchObject({
      kind: 'file_linked',
      detail: 'Checkout spec v2.docx',
    });
  });

  it('includes recent edits by others to files the user can see, with their folder', () => {
    const maya = feed('u_maya');
    const spec = maya.find((i) => i.id === 'fe_fl_spec');
    expect(spec).toMatchObject({
      kind: 'file_edited',
      actorId: 'u_leo',
      fileId: 'fl_spec',
      title: 'Checkout spec v2.docx',
      detail: 'Design',
    });
    // She edited the address states herself; the employee handbook is two months old.
    expect(maya.some((i) => i.fileId === 'fl_address_states')).toBe(false);
    expect(maya.some((i) => i.fileId === 'fl_handbook')).toBe(false);
  });
});

describe('activity feed permissions', () => {
  it('never shows files the user cannot open', () => {
    // Hugo can't see the Checkout Redesign folder at all.
    const hugo = feed('u_hugo');
    expect(
      hugo
        .filter((i) => i.fileId)
        .every((i) => fileAccess(db, user('u_hugo'), db.files.find((f) => f.id === i.fileId)!)),
    ).toBe(true);
    expect(hugo.some((i) => i.fileId === 'fl_interviews')).toBe(false);
  });

  it('drops events on tasks that were deleted', () => {
    db.tasks.find((t) => t.id === 't_error_states')!.deletedAt = new Date().toISOString();
    expect(feed('u_maya').some((i) => i.taskId === 't_error_states')).toBe(false);
  });

  it('shows a guest only activity on their own tasks and files shared with them', () => {
    // Someone comments on Elena's task, and on a task that is not hers.
    const now = new Date().toISOString();
    db.comments.push(
      {
        id: 'cm_mine',
        taskId: 't_ridgeline_selects',
        authorId: 'u_ava',
        body: 'Thanks!',
        createdAt: now,
      },
      { id: 'cm_other', taskId: 't_apple_pay', authorId: 'u_ava', body: 'Hmm', createdAt: now },
    );
    const elena = user('u_elena');
    const items = feed('u_elena');

    expect(items.some((i) => i.id === 'cm_mine')).toBe(true);
    expect(items.some((i) => i.id === 'cm_other')).toBe(false);
    // The seed has comments on t_shot_list, which she can't see.
    expect(items.some((i) => i.taskId === 't_shot_list')).toBe(false);
    for (const i of items) {
      if (i.taskId)
        expect(canSeeTask(db, elena, db.tasks.find((t) => t.id === i.taskId)!)).toBe(true);
      if (i.fileId)
        expect(fileAccess(db, elena, db.files.find((f) => f.id === i.fileId)!)).not.toBeNull();
    }
    // Team projects don't widen what a guest sees.
    expect(
      items.every(
        (i) =>
          i.taskId === undefined || ['t_ridgeline_selects', 't_location_scout'].includes(i.taskId),
      ),
    ).toBe(true);
  });

  it("names a file's folder only when the user can open it", () => {
    // Hero shoot brief is shared with Elena by name; the Briefs folder around it is not.
    const brief = feed('u_elena').find((i) => i.fileId === 'fl_shoot_brief');
    expect(brief).toBeDefined();
    expect(brief).not.toHaveProperty('detail');
  });
});

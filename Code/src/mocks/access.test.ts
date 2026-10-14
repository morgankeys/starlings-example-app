import { describe, expect, it } from 'vitest';
import { canSeeTask, fileAccess, folderAccess } from './access';
import { buildDatabase } from './seed';

const db = buildDatabase(new Date());
const user = (id: string) => db.users.find((u) => u.id === id)!;
const file = (id: string) => db.files.find((f) => f.id === id)!;
const folder = (id: string) => db.folders.find((f) => f.id === id)!;

describe('file access', () => {
  it('lets a team with a grant on a parent folder edit', () => {
    expect(fileAccess(db, user('u_leo'), file('fl_findings'))).toBe('edit');
  });

  it('keeps restricted project folders private to their teams', () => {
    expect(folderAccess(db, user('u_hugo'), folder('fd_checkout'))).toBeNull();
  });

  it('gives guests only what is shared with them', () => {
    const elena = user('u_elena');
    expect(fileAccess(db, elena, file('fl_shot_list'))).toBe('edit');
    expect(fileAccess(db, elena, file('fl_shoot_brief'))).toBe('view');
    expect(fileAccess(db, elena, file('fl_launch_plan'))).toBeNull();
  });

  it('gives org admins edit access everywhere', () => {
    expect(fileAccess(db, user('u_dana'), file('fl_spec'))).toBe('edit');
  });

  it('marks the owner as owner', () => {
    expect(fileAccess(db, user('u_sam'), file('fl_interviews'))).toBe('owner');
  });
});

describe('task visibility', () => {
  it('shows guests only their own tasks', () => {
    const elena = user('u_elena');
    const visible = db.tasks.filter((t) => canSeeTask(db, elena, t));
    expect(visible.every((t) => t.assigneeId === 'u_elena' || t.createdById === 'u_elena')).toBe(true);
    expect(visible.length).toBeGreaterThan(0);
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import type { Database } from './db-types';
import { HttpError } from './http';
import { inviteUser, signInUser, updateOrg, updateUser } from './members';
import { buildDatabase } from './seed';

let db: Database;
const user = (id: string) => db.users.find((u) => u.id === id)!;
const team = (id: string) => db.teams.find((t) => t.id === id)!;
const memberOfAny = (id: string) => db.teams.some((t) => t.members.some((m) => m.userId === id));

function failure(fn: () => unknown): HttpError {
  try {
    fn();
  } catch (err) {
    if (err instanceof HttpError) return err;
    throw err;
  }
  throw new Error('Expected the call to throw');
}

beforeEach(() => {
  db = buildDatabase(new Date());
});

describe('seed', () => {
  it('starts everyone active', () => {
    expect(db.users.every((u) => u.status === 'active')).toBe(true);
  });
});

describe('admin-only endpoints', () => {
  const maya = () => user('u_maya');

  it('refuses members with a 403', () => {
    expect(failure(() => updateOrg(db, maya(), { name: 'Nope' })).status).toBe(403);
    expect(
      failure(() =>
        inviteUser(db, maya(), {
          name: 'A B',
          email: 'ab@meridianoutdoor.com',
          title: 'Dev',
          role: 'member',
        }),
      ).status,
    ).toBe(403);
    expect(failure(() => updateUser(db, maya(), 'u_leo', { role: 'admin' })).status).toBe(403);
    expect(db.org.name).toBe('Meridian Outdoor Co.');
  });

  it('lets an admin rename the org, trimming and validating the name', () => {
    expect(updateOrg(db, user('u_dana'), { name: '  Meridian Co  ' }).name).toBe('Meridian Co');
    expect(db.org.name).toBe('Meridian Co');
    expect(failure(() => updateOrg(db, user('u_dana'), { name: '   ' })).status).toBe(400);
  });
});

describe('role and status safeguards', () => {
  it("won't let an admin change their own role or deactivate themselves", () => {
    const dana = user('u_dana');
    expect(failure(() => updateUser(db, dana, 'u_dana', { role: 'member' })).message).toMatch(
      /own role/,
    );
    expect(
      failure(() => updateUser(db, dana, 'u_dana', { status: 'deactivated' })).message,
    ).toMatch(/yourself/);
    expect(dana.role).toBe('admin');
    expect(dana.status).toBe('active');
  });

  it('keeps at least one active admin', () => {
    // A second admin who has not signed in yet cannot take over the last active admin.
    const newAdmin = inviteUser(db, user('u_dana'), {
      name: 'Pat Doe',
      email: 'pat@meridianoutdoor.com',
      title: 'COO',
      role: 'admin',
    });
    expect(newAdmin.status).toBe('invited');
    const err = failure(() => updateUser(db, newAdmin, 'u_dana', { role: 'member' }));
    expect(err.message).toMatch(/at least one admin/);
    expect(
      failure(() => updateUser(db, newAdmin, 'u_dana', { status: 'deactivated' })).status,
    ).toBe(400);
    // Once they have signed in, there are two active admins and the change is allowed.
    signInUser(db, newAdmin.id);
    expect(updateUser(db, newAdmin, 'u_dana', { role: 'member' }).role).toBe('member');
  });

  it('changes a role and a title', () => {
    const leo = updateUser(db, user('u_dana'), 'u_leo', { role: 'admin', title: ' Design Chief ' });
    expect(leo.role).toBe('admin');
    expect(leo.title).toBe('Design Chief');
  });
});

describe('deactivating', () => {
  it('blocks when the person is the last lead of a team, naming the team', () => {
    const err = failure(() => updateUser(db, user('u_dana'), 'u_maya', { status: 'deactivated' }));
    expect(err.status).toBe(400);
    expect(err.message).toContain('Product Design');
    expect(user('u_maya').status).toBe('active');
    expect(team('tm_design').members.some((m) => m.userId === 'u_maya')).toBe(true);
  });

  it('removes a non-lead from their teams but leaves their tasks assigned', () => {
    const assigned = db.tasks.filter((t) => t.assigneeId === 'u_leo').map((t) => t.id);
    expect(assigned.length).toBeGreaterThan(0);
    updateUser(db, user('u_dana'), 'u_leo', { status: 'deactivated' });
    expect(user('u_leo').status).toBe('deactivated');
    expect(memberOfAny('u_leo')).toBe(false);
    expect(db.tasks.filter((t) => t.assigneeId === 'u_leo').map((t) => t.id)).toEqual(assigned);
  });

  it('allows deactivating a lead once another lead exists', () => {
    team('tm_design').members.find((m) => m.userId === 'u_leo')!.role = 'lead';
    updateUser(db, user('u_dana'), 'u_maya', { status: 'deactivated' });
    expect(user('u_maya').status).toBe('deactivated');
  });

  it('can be undone by reactivating', () => {
    updateUser(db, user('u_dana'), 'u_leo', { status: 'deactivated' });
    updateUser(db, user('u_dana'), 'u_leo', { status: 'active' });
    expect(user('u_leo').status).toBe('active');
  });
});

describe('sign in', () => {
  it('refuses deactivated people with a clear 403', () => {
    updateUser(db, user('u_dana'), 'u_leo', { status: 'deactivated' });
    const err = failure(() => signInUser(db, 'u_leo'));
    expect(err.status).toBe(403);
    expect(err.message).toMatch(/deactivated/);
    expect(db.sessionUserId).toBeNull();
  });

  it('activates invited people when they sign in', () => {
    const invited = inviteUser(db, user('u_dana'), {
      name: 'Pat Doe',
      email: 'pat@meridianoutdoor.com',
      title: 'Buyer',
      role: 'member',
    });
    expect(invited.status).toBe('invited');
    signInUser(db, invited.id);
    expect(invited.status).toBe('active');
    expect(db.sessionUserId).toBe(invited.id);
  });
});

describe('invite validation', () => {
  const dana = () => user('u_dana');
  const valid = {
    name: 'Pat Doe',
    email: 'pat@meridianoutdoor.com',
    title: 'Buyer',
    role: 'member' as const,
  };

  it('creates an invited member', () => {
    const u = inviteUser(db, dana(), { ...valid, email: 'Pat@MeridianOutdoor.com' });
    expect(u).toMatchObject({
      email: 'pat@meridianoutdoor.com',
      status: 'invited',
      role: 'member',
    });
    expect(db.users).toContain(u);
  });

  it('rejects a malformed email', () => {
    expect(failure(() => inviteUser(db, dana(), { ...valid, email: 'pat@' })).message).toMatch(
      /valid email/,
    );
  });

  it('rejects a duplicate email, ignoring case', () => {
    const err = failure(() =>
      inviteUser(db, dana(), { ...valid, email: 'MAYA@meridianoutdoor.com' }),
    );
    expect(err.message).toMatch(/already/);
  });

  it('requires members to use the org domain', () => {
    const err = failure(() => inviteUser(db, dana(), { ...valid, email: 'pat@gmail.com' }));
    expect(err.message).toContain('meridianoutdoor.com');
  });

  it('lets guests use any domain but requires a company', () => {
    const guest = { ...valid, role: 'guest' as const, email: 'pat@studio.co' };
    expect(failure(() => inviteUser(db, dana(), guest)).message).toMatch(/company/);
    const u = inviteUser(db, dana(), { ...guest, company: 'Studio Co' });
    expect(u.company).toBe('Studio Co');
  });

  it('requires a name and a title', () => {
    expect(failure(() => inviteUser(db, dana(), { ...valid, name: ' ' })).status).toBe(400);
    expect(failure(() => inviteUser(db, dana(), { ...valid, title: '' })).status).toBe(400);
  });
});

describe('member to guest', () => {
  it('removes them from teams', () => {
    updateUser(db, user('u_dana'), 'u_leo', { role: 'guest' });
    expect(user('u_leo').role).toBe('guest');
    expect(memberOfAny('u_leo')).toBe(false);
  });

  it('is blocked for the only lead of a team', () => {
    const err = failure(() => updateUser(db, user('u_dana'), 'u_raj', { role: 'guest' }));
    expect(err.message).toContain('Engineering');
    expect(user('u_raj').role).toBe('member');
  });
});

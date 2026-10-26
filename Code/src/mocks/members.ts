// Workspace administration: renaming the org, inviting people, and changing roles or
// status. Pure functions over the database so handlers and tests share one set of rules.
import type { NewMember, OrgRole, Organization, User, UserPatch } from '@/domain/types';
import { newId } from './db';
import type { Database } from './db-types';
import { badRequest, forbidden, notFound } from './http';

const ROLES: OrgRole[] = ['admin', 'member', 'guest'];
const COLORS: User['color'][] = ['violet', 'sky', 'teal', 'amber', 'rust'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requireAdmin(actor: User): void {
  if (actor.role !== 'admin') throw forbidden('Only workspace admins can do that');
}

const activeAdmins = (db: Database) =>
  db.users.filter((u) => u.role === 'admin' && u.status === 'active');

export function updateOrg(db: Database, actor: User, input: { name?: string }): Organization {
  requireAdmin(actor);
  const name = input.name?.trim();
  if (!name) throw badRequest('Give the workspace a name');
  if (name.length > 60) throw badRequest('Keep the workspace name under 60 characters');
  db.org = { ...db.org, name };
  return db.org;
}

export function inviteUser(db: Database, actor: User, input: Partial<NewMember>): User {
  requireAdmin(actor);
  const name = input.name?.trim() ?? '';
  const email = input.email?.trim().toLowerCase() ?? '';
  const title = input.title?.trim() ?? '';
  const company = input.company?.trim() ?? '';
  if (!name) throw badRequest('Enter their name');
  if (!email) throw badRequest('Enter their email');
  if (!EMAIL.test(email)) throw badRequest('Enter a valid email address, like name@company.com');
  if (!title) throw badRequest('Enter their job title');
  if (!input.role || !ROLES.includes(input.role)) throw badRequest('Choose a role');
  if (db.users.some((u) => u.email.toLowerCase() === email)) {
    throw badRequest('Someone with that email is already in this workspace');
  }
  if (input.role === 'guest') {
    if (!company) throw badRequest('Guests need a company');
  } else if (!email.endsWith(`@${db.org.domain}`)) {
    throw badRequest(`Members need a ${db.org.domain} email address`);
  }
  const user: User = {
    id: newId('u'),
    name,
    email,
    title,
    role: input.role,
    status: 'invited',
    color: COLORS[db.users.length % COLORS.length],
    location: 'Not set yet',
    ...(input.role === 'guest' ? { company } : {}),
  };
  db.users.push(user);
  return user;
}

/** Remove someone from every team, unless they are the only lead of one. */
function leaveTeams(db: Database, user: User, action: string): void {
  const blocking = db.teams.filter((t) => {
    const leads = t.members.filter((m) => m.role === 'lead');
    return leads.length === 1 && leads[0].userId === user.id;
  });
  if (blocking.length > 0) {
    const names = blocking.map((t) => t.name).join(' and ');
    throw badRequest(
      `${user.name} is the only lead of ${names}. Make someone else a lead before you ${action}.`,
    );
  }
  for (const team of db.teams) {
    team.members = team.members.filter((m) => m.userId !== user.id);
  }
}

export function updateUser(db: Database, actor: User, id: string, patch: UserPatch): User {
  requireAdmin(actor);
  const target = db.users.find((u) => u.id === id);
  if (!target) throw notFound('Person');

  if (patch.role !== undefined && !ROLES.includes(patch.role)) throw badRequest('Unknown role');
  if (patch.status !== undefined && patch.status !== 'active' && patch.status !== 'deactivated') {
    throw badRequest('Status must be active or deactivated');
  }
  const title = patch.title?.trim();
  if (patch.title !== undefined && !title) throw badRequest('Enter a job title');

  const roleChanges = patch.role !== undefined && patch.role !== target.role;
  const deactivates = patch.status === 'deactivated' && target.status !== 'deactivated';
  const reactivates = patch.status === 'active' && target.status === 'deactivated';

  if (target.id === actor.id && roleChanges) throw badRequest("You can't change your own role");
  if (target.id === actor.id && deactivates) throw badRequest("You can't deactivate yourself");

  const losesAdmin =
    target.role === 'admin' &&
    target.status === 'active' &&
    (deactivates || (roleChanges && patch.role !== 'admin'));
  if (losesAdmin && activeAdmins(db).length <= 1) {
    throw badRequest('Birdy needs at least one admin');
  }

  // Check the team consequences before changing anything.
  if (deactivates) leaveTeams(db, target, 'deactivate them');
  else if (roleChanges && patch.role === 'guest') leaveTeams(db, target, 'make them a guest');

  if (roleChanges) target.role = patch.role!;
  if (deactivates) target.status = 'deactivated';
  if (reactivates) target.status = 'active';
  if (title) target.title = title;
  return target;
}

/** Sign in as someone. Deactivated people are refused; invited people become active. */
export function signInUser(db: Database, userId: string): User {
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw badRequest('Unknown user');
  if (user.status === 'deactivated') {
    throw forbidden(
      `${user.name}’s account is deactivated. Ask a workspace admin to reactivate it.`,
    );
  }
  if (user.status === 'invited') user.status = 'active';
  db.sessionUserId = user.id;
  return user;
}

import { http } from 'msw';
import type {
  AccentColor,
  ProjectSummary,
  Session,
  TeamRole,
  TeamSummary,
  User,
} from '@/domain/types';
import { canManageTeam, canSeeTask, teamIdsOf } from '../access';
import { resetDb } from '../db';
import type { Database } from '../db-types';
import {
  API,
  badRequest,
  body,
  forbidden,
  getDemoSettings,
  notFound,
  route,
  setDemoSettings,
  type DemoSettings,
} from '../http';
import { newId } from '../db';

function session(db: Database, user: User): Session {
  return { user, org: db.org, teams: db.teams.filter((t) => t.members.some((m) => m.userId === user.id)) };
}

function teamSummary(db: Database, user: User, teamId: string): TeamSummary {
  const team = db.teams.find((t) => t.id === teamId);
  if (!team) throw notFound('Team');
  const openTaskCount = db.tasks.filter(
    (t) => t.teamId === team.id && t.status !== 'done' && canSeeTask(db, user, t),
  ).length;
  return { ...team, openTaskCount };
}

function visibleProjects(db: Database, user: User) {
  if (user.role !== 'guest') return db.projects;
  const mine = new Set(db.tasks.filter((t) => canSeeTask(db, user, t)).map((t) => t.projectId));
  return db.projects.filter((p) => mine.has(p.id));
}

function projectSummary(db: Database, user: User, projectId: string): ProjectSummary {
  const project = visibleProjects(db, user).find((p) => p.id === projectId);
  if (!project) throw notFound('Project');
  const tasks = db.tasks.filter((t) => t.projectId === project.id && canSeeTask(db, user, t));
  return {
    ...project,
    openTaskCount: tasks.filter((t) => t.status !== 'done').length,
    doneTaskCount: tasks.filter((t) => t.status === 'done').length,
  };
}

export const orgHandlers = [
  // ---- Session ------------------------------------------------------------------------
  http.get(`${API}/session`, route(({ db, user }) => session(db, user))),

  /** Public: the people you can sign in as (the prototype has no passwords). */
  http.get(
    `${API}/session/people`,
    route(({ db }) => ({ org: db.org, users: db.users }), { auth: false }),
  ),

  http.post(
    `${API}/session`,
    route(
      async ({ request, db }) => {
        const { userId } = await body<{ userId: string }>(request);
        const user = db.users.find((u) => u.id === userId);
        if (!user) throw badRequest('Unknown user');
        db.sessionUserId = user.id;
        return session(db, user);
      },
      { auth: false },
    ),
  ),

  http.delete(
    `${API}/session`,
    route(
      ({ db }) => {
        db.sessionUserId = null;
        return null;
      },
      { auth: false },
    ),
  ),

  // ---- People -------------------------------------------------------------------------
  http.get(`${API}/users`, route(({ db }) => db.users)),

  http.get<{ id: string }>(
    `${API}/users/:id`,
    route(({ db, params }) => {
      const user = db.users.find((u) => u.id === params.id);
      if (!user) throw notFound('Person');
      return user;
    }),
  ),

  // ---- Teams --------------------------------------------------------------------------
  http.get(
    `${API}/teams`,
    route(({ db, user, url }) => {
      const mine = url.searchParams.get('mine') === 'true';
      const ids = mine || user.role === 'guest' ? teamIdsOf(db, user.id) : db.teams.map((t) => t.id);
      return ids.map((id) => teamSummary(db, user, id));
    }),
  ),

  http.get<{ id: string }>(
    `${API}/teams/:id`,
    route(({ db, user, params }) => ({
      ...teamSummary(db, user, params.id),
      canManage: canManageTeam(db, user, params.id),
    })),
  ),

  http.post(
    `${API}/teams`,
    route(async ({ db, user, request }) => {
      if (user.role === 'guest') throw forbidden('Guests cannot create teams');
      const input = await body<{ name: string; description?: string; color?: AccentColor }>(request);
      const name = input.name?.trim();
      if (!name) throw badRequest('Give the team a name');
      if (db.teams.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
        throw badRequest('A team with that name already exists');
      }
      const team = {
        id: newId('tm'),
        name,
        description: input.description?.trim() ?? '',
        color: input.color ?? 'sky',
        members: [{ userId: user.id, role: 'lead' as TeamRole }],
      };
      db.teams.push(team);
      return teamSummary(db, user, team.id);
    }),
  ),

  http.post<{ id: string }>(
    `${API}/teams/:id/members`,
    route(async ({ db, user, params, request }) => {
      const team = db.teams.find((t) => t.id === params.id);
      if (!team) throw notFound('Team');
      if (!canManageTeam(db, user, team.id)) throw forbidden('Only team leads and admins can add members');
      const { userId, role = 'member' } = await body<{ userId: string; role?: TeamRole }>(request);
      const member = db.users.find((u) => u.id === userId);
      if (!member) throw badRequest('Unknown person');
      if (member.role === 'guest') throw badRequest('Guests cannot join teams');
      if (!team.members.some((m) => m.userId === userId)) team.members.push({ userId, role });
      return teamSummary(db, user, team.id);
    }),
  ),

  http.patch<{ id: string; userId: string }>(
    `${API}/teams/:id/members/:userId`,
    route(async ({ db, user, params, request }) => {
      const team = db.teams.find((t) => t.id === params.id);
      if (!team) throw notFound('Team');
      if (!canManageTeam(db, user, team.id)) throw forbidden();
      const { role } = await body<{ role: TeamRole }>(request);
      const member = team.members.find((m) => m.userId === params.userId);
      if (!member) throw notFound('Member');
      if (role === 'member' && member.role === 'lead' && team.members.filter((m) => m.role === 'lead').length === 1) {
        throw badRequest('A team needs at least one lead');
      }
      member.role = role;
      return teamSummary(db, user, team.id);
    }),
  ),

  http.delete<{ id: string; userId: string }>(
    `${API}/teams/:id/members/:userId`,
    route(({ db, user, params }) => {
      const team = db.teams.find((t) => t.id === params.id);
      if (!team) throw notFound('Team');
      if (!canManageTeam(db, user, team.id)) throw forbidden('Only team leads and admins can remove members');
      const member = team.members.find((m) => m.userId === params.userId);
      if (member?.role === 'lead' && team.members.filter((m) => m.role === 'lead').length === 1) {
        throw badRequest('A team needs at least one lead');
      }
      team.members = team.members.filter((m) => m.userId !== params.userId);
      return teamSummary(db, user, team.id);
    }),
  ),

  // ---- Projects -----------------------------------------------------------------------
  http.get(
    `${API}/projects`,
    route(({ db, user }) => visibleProjects(db, user).map((p) => projectSummary(db, user, p.id))),
  ),

  http.get<{ id: string }>(
    `${API}/projects/:id`,
    route(({ db, user, params }) => projectSummary(db, user, params.id)),
  ),

  // ---- Demo panel (no latency or forced failures, so it can always recover) -----------
  http.get(`${API}/__demo/settings`, route(() => getDemoSettings(), { auth: false, demo: true })),

  http.put(
    `${API}/__demo/settings`,
    route(
      async ({ request }) => {
        const next = { ...getDemoSettings(), ...(await body<Partial<DemoSettings>>(request)) };
        setDemoSettings(next);
        return next;
      },
      { auth: false, demo: true },
    ),
  ),

  http.post(
    `${API}/__demo/reset`,
    route(
      async ({ request }) => {
        const { mode = 'seed' } = await body<{ mode?: 'seed' | 'empty' }>(request);
        resetDb(mode);
        return { ok: true, mode };
      },
      { auth: false, demo: true },
    ),
  ),
];

import type { Database } from '../db-types';
import { seedClock } from './dates';
import { buildFiles, buildFolders } from './files';
import { org, projects, teams, users } from './people';
import { buildTasks } from './tasks';

export const DB_VERSION = 1;

/**
 * Build a fresh database. `seed` is Meridian's full workspace; `empty` keeps the org,
 * people and teams but no projects, tasks or files (for onboarding and empty states).
 */
export function buildDatabase(today: Date, mode: 'seed' | 'empty' = 'seed'): Database {
  const clock = seedClock(today);
  const base: Database = {
    meta: { version: DB_VERSION, seededOn: clock.day(0), mode },
    sessionUserId: null,
    org,
    users: structuredClone(users),
    teams: structuredClone(teams),
    projects: [],
    tasks: [],
    comments: [],
    activity: [],
    folders: buildFolders(clock).filter((f) => f.id === 'fd_root'),
    files: [],
    stars: {},
    opens: {},
  };
  if (mode === 'empty') return base;

  const { tasks, comments, activity } = buildTasks(clock);
  return {
    ...base,
    projects: structuredClone(projects),
    tasks,
    comments,
    activity,
    folders: buildFolders(clock),
    files: buildFiles(clock),
    stars: {
      u_maya: ['fl_spec', 'fl_launch_plan', 'fl_review_notes'],
      u_julia: ['fl_launch_plan', 'fl_page_map'],
      u_elena: ['fl_shot_list'],
    },
    opens: {
      u_maya: {
        fl_address_states: clock.at(0, 8, 40),
        fl_interviews: clock.at(-1, 16, 5),
        fl_launch_notes: clock.at(-1, 13, 20),
        fl_spec: clock.at(-1, 10, 15),
        fl_shot_list: clock.at(-2, 15, 45),
      },
    },
  };
}

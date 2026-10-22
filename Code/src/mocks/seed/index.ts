import type { AssistantContext } from '@/domain/types';
import { answer } from '../assistant/engine';
import type { AssistantThreadRecord, Database } from '../db-types';
import { seedClock, type SeedClock } from './dates';
import { buildFiles, buildFolders } from './files';
import { org, projects, teams, users } from './people';
import { buildTasks } from './tasks';

export const DB_VERSION = 3;

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
    assistantThreads: [],
  };
  if (mode === 'empty') return base;

  const { tasks, comments, activity } = buildTasks(clock);
  const seeded: Database = {
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
  seeded.assistantThreads = buildAssistantThreads(seeded, clock);
  return seeded;
}

interface SeedThread {
  id: string;
  at: [day: number, hour: number];
  questions: Array<{ message: string; context: AssistantContext | null }>;
}

/** Maya's past conversations. The answers are real: they come from the engine. */
const MAYA_THREADS: SeedThread[] = [
  {
    id: 'th_seed_overdue',
    at: [-1, 16],
    questions: [
      { message: 'What’s overdue across my teams?', context: null },
      { message: 'What’s blocked right now?', context: null },
    ],
  },
  {
    id: 'th_seed_review',
    at: [-3, 11],
    questions: [
      {
        message: 'Summarize this file',
        context: { type: 'file', id: 'fl_review_notes', label: 'Design review notes' },
      },
    ],
  },
  {
    id: 'th_seed_checkout',
    at: [-6, 9],
    questions: [
      { message: 'Find files about checkout', context: null },
      {
        message: 'Is this project on track?',
        context: { type: 'project', id: 'p_checkout', label: 'Checkout Redesign' },
      },
    ],
  },
];

function buildAssistantThreads(db: Database, clock: SeedClock): AssistantThreadRecord[] {
  const maya = db.users.find((u) => u.id === 'u_maya')!;
  return MAYA_THREADS.map((thread) => {
    const messages: AssistantThreadRecord['messages'] = [];
    thread.questions.forEach((q, n) => {
      const res = answer(db, maya, { message: q.message, context: q.context });
      messages.push(
        {
          id: `${thread.id}_${n}q`,
          role: 'user',
          text: q.message,
          citations: [],
          context: q.context,
        },
        {
          id: `${thread.id}_${n}a`,
          role: 'assistant',
          text: res.text,
          citations: res.citations,
          context: q.context,
          ...(res.actions.length ? { actions: res.actions } : {}),
        },
      );
    });
    const [day, hour] = thread.at;
    return {
      id: thread.id,
      userId: maya.id,
      title: thread.questions[0].message.slice(0, 60),
      createdAt: clock.at(day, hour),
      updatedAt: clock.at(day, hour, 12),
      messages,
      deletedAt: null,
    };
  });
}

// Suggested tasks for Ask Birdy: turning a file's action items, or an explicit request such
// as "remind me to send the recap tomorrow", into tasks the user can review and create.
// Nothing here writes to the database. The chat shows the suggestions and the user confirms.
import type { AssistantContext, ID, SuggestedTask, User } from '@/domain/types';
import { fold, parseQuickAdd } from '@/lib/quickAdd';
import { canSeeTask, fileAccess, liveFolder, teamIdsOf } from '../access';
import type { Database, FileRecord, TaskRecord } from '../db-types';

// ---- Matching against existing tasks ----------------------------------------------------

/**
 * Two titles describe the same work when their Dice coefficient (twice the shared words
 * over the total words) reaches this value AND they share at least `MIN_SHARED_WORDS`.
 *
 * 0.6 is the point where the paraphrases in the seed match ("Finish tents and shelters
 * copy" vs "Write product copy for tents and shelters" scores 0.67) while the closest
 * unrelated pair does not ("Write a test plan for CSV inventory uploads" vs "Usability test
 * plan for round 3" scores 0.36). Requiring two shared words stops a lone verb like "send"
 * or "draft" from linking unrelated tasks.
 */
export const MATCH_THRESHOLD = 0.6;
export const MIN_SHARED_WORDS = 2;

const STOPWORDS = new Set(
  'a an and the to of for on in at with from by or our this that it is be as into up'.split(' '),
);

const stem = (w: string) =>
  w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;

/** Lowercase, accent-free words with punctuation and stopwords removed, lightly stemmed. */
export function titleWords(title: string): Set<string> {
  return new Set(
    fold(title)
      .split(/[^a-z0-9]+/)
      .filter((w) => w && !STOPWORDS.has(w))
      .map(stem),
  );
}

export function titleSimilarity(a: string, b: string): { shared: number; score: number } {
  const wa = titleWords(a);
  const wb = titleWords(b);
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  const total = wa.size + wb.size;
  return { shared, score: total ? (2 * shared) / total : 0 };
}

/** Lexicographic comparison: the first differing entry decides. */
function beats(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

/** The best existing task (visible to `user`, not deleted) that already covers `s`. */
function findExisting(db: Database, user: User, s: SuggestedTask): TaskRecord | undefined {
  let best: { task: TaskRecord; rank: number[] } | undefined;
  for (const task of db.tasks) {
    if (!canSeeTask(db, user, task)) continue;
    const { shared, score } = titleSimilarity(s.title, task.title);
    if (shared < MIN_SHARED_WORDS || score < MATCH_THRESHOLD) continue;
    // Ties go to a task that already links the same file, then the same assignee.
    const rank = [
      score,
      Number(s.fileIds.some((f) => task.fileIds.includes(f))),
      Number(!!s.assigneeId && task.assigneeId === s.assigneeId),
    ];
    if (!best || beats(rank, best.rank)) best = { task, rank };
  }
  return best?.task;
}

/** Fill in `existingTaskId` on every suggestion that an existing task already covers. */
export function markTracked(db: Database, user: User, items: SuggestedTask[]): SuggestedTask[] {
  return items.map((s) => ({ ...s, existingTaskId: findExisting(db, user, s)?.id ?? null }));
}

// ---- Shared helpers ---------------------------------------------------------------------

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const cleanTitle = (s: string) =>
  capitalize(s.replace(/\s+/g, ' ').trim().replace(/\.+$/, '').trim());

/** The project of the nearest ancestor folder (or the folder itself) that belongs to one. */
export function projectIdOfFolder(db: Database, folderId: ID): ID | null {
  const seen = new Set<ID>();
  let folder = liveFolder(db, folderId);
  while (folder && !seen.has(folder.id)) {
    if (folder.projectId) return folder.projectId;
    seen.add(folder.id);
    folder = folder.parentId ? liveFolder(db, folder.parentId) : undefined;
  }
  return null;
}

function placement(db: Database, projectId: ID | null, assigneeId: ID | null) {
  const project = db.projects.find((p) => p.id === projectId);
  const teamId = project?.teamId ?? (assigneeId ? (teamIdsOf(db, assigneeId)[0] ?? null) : null);
  return { projectId: project?.id ?? null, teamId };
}

// ---- Action items in a file -------------------------------------------------------------

/**
 * Turn "Maya to finalize address form error states." into a suggestion assigned to Maya.
 * `actions` are the text after "Action:" in the document. A line that isn't shaped like
 * "<Name> to <verb phrase>" keeps its whole text as the title, unassigned.
 */
export function suggestFromActions(
  db: Database,
  user: User,
  file: FileRecord,
  actions: string[],
): SuggestedTask[] {
  if (user.role === 'guest') return [];
  const projectId = projectIdOfFolder(db, file.folderId);
  const items = actions.flatMap((action, index): SuggestedTask[] => {
    const m = action.match(/^([\p{L}.'-]+(?:\s[\p{L}.'-]+)?)\s+to\s+(.+)$/u);
    const who = m ? fold(m[1]) : '';
    const assignee = m
      ? db.users.find((u) => fold(u.name.split(' ')[0]) === who || fold(u.name) === who)
      : undefined;
    const title = cleanTitle(m ? m[2] : action);
    if (!title) return [];
    return [
      {
        key: `${file.id}:${index}`,
        title,
        description: `From “${file.name}”.`,
        assigneeId: assignee?.id ?? null,
        dueDate: null,
        priority: 'medium',
        ...placement(db, projectId, assignee?.id ?? null),
        fileIds: [file.id],
        existingTaskId: null,
      },
    ];
  });
  return markTracked(db, user, items);
}

// ---- Explicit requests ------------------------------------------------------------------

export interface TaskRequest {
  /** "create a follow-up task": the title comes from the task being viewed. */
  followUp: boolean;
  /** What the task should be, still carrying quick-add tokens such as "tomorrow !high". */
  body: string;
}

const LEAD_IN = new RegExp(
  [
    '^\\s*(?:(?:please|can you|could you|would you)\\s+)*',
    '(?:',
    // "create a task to …", "add a follow-up task: …", "make me a todo for …"
    '(?:create|add|make|new|set up)\\s+(?:me\\s+)?(?:a|an|another)\\s+(?:new\\s+)?(follow[\\s-]?up\\s+)?(?:task|todo|to-?do|reminder)\\b\\s*(?:to\\b|for\\b|about\\b|[:\\-–—])?',
    // "remind me to …", "todo: …"
    '|remind me to\\b',
    '|(?:todo|to-do|task)\\s*:',
    ')\\s*(.*)$',
  ].join(''),
  'i',
);

/** Recognize "create a task to …", "add a task: …", "remind me to …" and "todo: …". */
export function parseTaskRequest(message: string): TaskRequest | null {
  const m = message.replace(/[’]/g, "'").match(LEAD_IN);
  if (!m) return null;
  return { followUp: !!m[1], body: m[2].trim() };
}

/** One suggestion for an explicit request, assigned to the asker unless an @name is given. */
export function suggestFromRequest(
  db: Database,
  user: User,
  request: TaskRequest,
  context: AssistantContext | null,
  today = new Date(),
): SuggestedTask | null {
  if (user.role === 'guest') return null;
  const task =
    context?.type === 'task'
      ? db.tasks.find((t) => t.id === context.id && canSeeTask(db, user, t))
      : undefined;
  const file =
    context?.type === 'file'
      ? db.files.find((f) => f.id === context.id && !f.deletedAt && fileAccess(db, user, f))
      : undefined;

  const parsed = parseQuickAdd(request.body, db.users, today);
  const title = cleanTitle(
    parsed.title || (request.followUp && task ? `Follow up on ${task.title}` : ''),
  );
  if (!title) return null;

  const assigneeId = parsed.assigneeId ?? user.id;
  let projectId: ID | null = null;
  let teamId: ID | null | undefined;
  if (task) {
    projectId = task.projectId;
    teamId = task.teamId;
  } else if (file) {
    projectId = projectIdOfFolder(db, file.folderId);
  } else if (context?.type === 'project') {
    projectId = context.id;
  } else if (context?.type === 'team') {
    teamId = context.id;
  }
  const placed = placement(db, projectId, assigneeId);

  const [suggestion] = markTracked(db, user, [
    {
      key: 'request:0',
      title,
      description: file ? `From “${file.name}”.` : task ? `Follow-up to “${task.title}”.` : '',
      assigneeId,
      dueDate: parsed.dueDate ?? null,
      priority: parsed.priority ?? 'medium',
      projectId: placed.projectId,
      teamId: teamId === undefined ? placed.teamId : teamId,
      fileIds: file ? [file.id] : [],
      existingTaskId: null,
    },
  ]);
  return suggestion;
}

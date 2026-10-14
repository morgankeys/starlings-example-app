// Ask Birdy, simulated. A small intent router answers from the live mock database, so
// every answer agrees with what is on screen and respects the asker's permissions.
//
// Answers are plain text in the subset the chat renders: paragraphs, "- " bullets,
// **bold**, and citation tokens like [[task:t_123]] that the UI turns into chips.
// To swap in a real model, replace `answer()` behind the same endpoint.
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import type {
  AssistantRequest,
  Citation,
  FocusSummary,
  ID,
  User,
} from '@/domain/types';
import { canSeeTask, fileAccess, teamIdsOf, toTask, visibleFiles } from '../access';
import type { Database, FileRecord, TaskRecord } from '../db-types';

export interface AssistantAnswer {
  text: string;
  citations: Citation[];
}

// ---- Helpers ---------------------------------------------------------------------------

const today = () => format(new Date(), 'yyyy-MM-dd');
const daysUntil = (date: string) => differenceInCalendarDays(parseISO(date), parseISO(today()));
const firstName = (db: Database, id: ID | null) =>
  id ? (db.users.find((u) => u.id === id)?.name.split(' ')[0] ?? 'Someone') : 'Nobody';
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function duePhrase(date: string | null): string {
  if (!date) return 'no due date';
  const d = daysUntil(date);
  if (d < 0) return `overdue by ${plural(-d, 'day')}`;
  if (d === 0) return 'due today';
  if (d === 1) return 'due tomorrow';
  if (d < 7) return `due ${format(parseISO(date), 'EEEE')}`;
  return `due ${format(parseISO(date), 'MMM d')}`;
}

const isOpen = (t: TaskRecord) => t.status !== 'done' && !t.deletedAt;

class Cites {
  private items = new Map<string, Citation>();
  constructor(private db: Database) {}
  task(t: TaskRecord) {
    this.items.set(`task:${t.id}`, { type: 'task', id: t.id, title: t.title });
    return `[[task:${t.id}]]`;
  }
  file(f: FileRecord) {
    this.items.set(`file:${f.id}`, { type: 'file', id: f.id, title: f.name });
    return `[[file:${f.id}]]`;
  }
  user(id: ID) {
    const u = this.db.users.find((x) => x.id === id);
    if (u) this.items.set(`user:${u.id}`, { type: 'user', id: u.id, title: u.name });
    return `[[user:${id}]]`;
  }
  list() {
    return [...this.items.values()];
  }
}

function visibleTasks(db: Database, user: User) {
  return db.tasks.filter((t) => canSeeTask(db, user, t));
}

/** Open tasks that say they are blocked by `t` (they quote the start of its title). */
function blockedBy(db: Database, user: User, t: TaskRecord): TaskRecord[] {
  const stem = t.title.toLowerCase().split(' ').slice(0, 4).join(' ');
  return visibleTasks(db, user).filter(
    (o) => o.id !== t.id && isOpen(o) && o.labels.includes('blocked') && o.description.toLowerCase().includes(stem),
  );
}

function blockersOf(db: Database, user: User, t: TaskRecord): TaskRecord[] {
  return visibleTasks(db, user).filter((o) => o.id !== t.id && isOpen(o) && blockedBy(db, user, o).some((b) => b.id === t.id));
}

// ---- Focus -----------------------------------------------------------------------------

const PRIORITY_WEIGHT = { urgent: 40, high: 25, medium: 10, low: 0 } as const;

function focusScore(db: Database, user: User, t: TaskRecord): { score: number; reason: string } {
  let score = PRIORITY_WEIGHT[t.priority];
  const reasons: string[] = [];
  if (t.dueDate) {
    const d = daysUntil(t.dueDate);
    if (d < 0) score += 50 + -d * 2;
    else if (d === 0) score += 35;
    else if (d === 1) score += 20;
    else if (d < 7) score += 8;
    reasons.push(duePhrase(t.dueDate).replace(/^./, (c) => c.toUpperCase()));
  }
  if (t.priority === 'urgent' || t.priority === 'high') reasons.push(`${t.priority} priority`);
  const blocking = blockedBy(db, user, t);
  if (blocking.length) {
    score += 30;
    reasons.push(`${firstName(db, blocking[0].assigneeId)} is blocked on it`);
  } else if (/waiting/i.test(t.description)) {
    score += 15;
    reasons.push('others are waiting on it');
  }
  const recent = db.comments.filter(
    (c) => c.taskId === t.id && c.authorId !== user.id && differenceInCalendarDays(new Date(), new Date(c.createdAt)) <= 1,
  );
  if (recent.length) reasons.push(plural(recent.length, 'new comment'));
  return { score, reason: reasons.join(' · ') };
}

export function focus(db: Database, user: User): FocusSummary {
  const mine = visibleTasks(db, user).filter((t) => isOpen(t) && t.assigneeId === user.id);
  const ranked = mine
    .map((t) => ({ t, ...focusScore(db, user, t) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const overdue = mine.filter((t) => t.dueDate && daysUntil(t.dueDate) < 0).length;
  const dueToday = mine.filter((t) => t.dueDate && daysUntil(t.dueDate) === 0).length;

  let headline: string;
  if (mine.length === 0) headline = "You're all caught up. Nothing is assigned to you.";
  else if (overdue || dueToday) {
    const parts = [overdue && `${overdue} overdue`, dueToday && `${dueToday} due today`].filter(Boolean);
    headline = `You have ${parts.join(' and ')}. Start with “${ranked[0].t.title}”.`;
  } else headline = `Nothing is overdue. “${ranked[0].t.title}” is the best place to start.`;

  return { headline, items: ranked.map(({ t, reason }) => ({ task: toTask(db, t), reason })) };
}

// ---- Intents ---------------------------------------------------------------------------

interface Ctx {
  db: Database;
  user: User;
  req: AssistantRequest;
  q: string;
  cite: Cites;
}

function parseDoc(text: string) {
  const sections: Array<{ heading: string; lines: string[] }> = [{ heading: '', lines: [] }];
  let title = '';
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('# ')) title = line.slice(2);
    else if (line.startsWith('## ')) sections.push({ heading: line.slice(3), lines: [] });
    else sections[sections.length - 1].lines.push(line);
  }
  const bullets = (pred: (s: string) => boolean) =>
    sections.flatMap((s) => s.lines.filter((l) => l.startsWith('- ')).map((l) => l.slice(2)).filter(pred));
  const decisions = bullets((l) => /^decision:/i.test(l)).map((l) => l.replace(/^decision:\s*/i, ''));
  const actions = bullets((l) => /^action:/i.test(l)).map((l) => l.replace(/^action:\s*/i, ''));
  const paragraphs = sections.flatMap((s) => s.lines.filter((l) => !l.startsWith('- ')));
  const preferred = /finding|goal|must|risk|status|recommend|milestone|quote|theme|shoot|channel/i;
  const highlightSections = [...sections].sort(
    (a, b) => Number(preferred.test(b.heading)) - Number(preferred.test(a.heading)),
  );
  const highlights = highlightSections
    .flatMap((s) => s.lines.filter((l) => l.startsWith('- ')).map((l) => l.slice(2)))
    .filter((l) => !/^(decision|action):/i.test(l))
    .slice(0, 4);
  return { title, sections, decisions, actions, paragraphs, highlights };
}

function linkedTasksOf(ctx: Ctx, f: FileRecord) {
  return visibleTasks(ctx.db, ctx.user).filter((t) => t.fileIds.includes(f.id) && isOpen(t));
}

function summarizeFile(ctx: Ctx, f: FileRecord): string {
  const { cite, db } = ctx;
  const ref = cite.file(f);
  const linked = linkedTasksOf(ctx, f);
  const linkedLine = linked.length
    ? `\n\nOpen tasks that use it: ${linked.map((t) => cite.task(t)).join(' ')}`
    : '';
  if (!f.contentText) {
    return `${ref} is ${f.kind === 'image' ? 'an image' : 'a file'} I can't read the contents of. It belongs to ${cite.user(f.ownerId)} and was last updated by ${firstName(db, f.updatedById)} on ${format(new Date(f.updatedAt), 'MMM d')}.${linkedLine}`;
  }
  const doc = parseDoc(f.contentText);
  const out = [`Here's the short version of ${ref}:`];
  if (doc.paragraphs.length) out.push(doc.paragraphs.slice(0, 2).join(' '));
  if (doc.highlights.length) out.push(`**Key points**\n${doc.highlights.map((h) => `- ${h}`).join('\n')}`);
  if (doc.decisions.length) out.push(`**Decisions**\n${doc.decisions.map((d) => `- ${d}`).join('\n')}`);
  if (doc.actions.length) out.push(`**Action items**\n${doc.actions.map((a) => `- ${a}`).join('\n')}`);
  return out.join('\n\n') + linkedLine;
}

function decisionsIn(ctx: Ctx, f: FileRecord): string {
  const doc = parseDoc(f.contentText);
  const ref = ctx.cite.file(f);
  if (!doc.decisions.length && !doc.actions.length) {
    return `${ref} doesn't record any decisions or action items. Want a summary instead?`;
  }
  const out: string[] = [];
  if (doc.decisions.length) out.push(`${ref} records ${plural(doc.decisions.length, 'decision')}:\n${doc.decisions.map((d) => `- ${d}`).join('\n')}`);
  if (doc.actions.length) out.push(`**Action items**\n${doc.actions.map((a) => `- ${a}`).join('\n')}`);
  return out.join('\n\n');
}

function taskLine(ctx: Ctx, t: TaskRecord, opts: { who?: boolean } = {}) {
  const who = opts.who && t.assigneeId ? ` · ${firstName(ctx.db, t.assigneeId)}` : '';
  return `- ${ctx.cite.task(t)} — ${duePhrase(t.dueDate)}${t.priority === 'urgent' || t.priority === 'high' ? `, ${t.priority}` : ''}${who}`;
}

/** Tasks in scope for list-style questions: context team/project, "my", or everything visible. */
function scopedTasks(ctx: Ctx): { tasks: TaskRecord[]; scope: string; mine: boolean } {
  const { db, user, req, q } = ctx;
  const all = visibleTasks(db, user).filter(isOpen);
  const mine = /\b(my|me|i)\b/.test(q) && !/\bmy teams?\b/.test(q);
  if (req.context?.type === 'team') {
    return { tasks: all.filter((t) => t.teamId === req.context!.id), scope: req.context.label, mine: false };
  }
  if (req.context?.type === 'project') {
    return { tasks: all.filter((t) => t.projectId === req.context!.id), scope: req.context.label, mine: false };
  }
  if (req.context?.type === 'person') {
    return { tasks: all.filter((t) => t.assigneeId === req.context!.id), scope: req.context.label, mine: false };
  }
  const project = db.projects.find((p) => q.includes(p.name.toLowerCase().replace(/'/g, '')) || q.includes(p.name.toLowerCase()));
  if (project) return { tasks: all.filter((t) => t.projectId === project.id), scope: project.name, mine: false };
  if (mine) return { tasks: all.filter((t) => t.assigneeId === user.id), scope: 'your tasks', mine: true };
  if (/\bteams?\b/.test(q)) {
    const myTeams = teamIdsOf(db, user.id);
    return { tasks: all.filter((t) => t.teamId && myTeams.includes(t.teamId)), scope: 'your teams', mine: false };
  }
  return { tasks: all.filter((t) => t.assigneeId === user.id), scope: 'your tasks', mine: true };
}

function answerFocus(ctx: Ctx): string {
  const f = focus(ctx.db, ctx.user);
  if (!f.items.length) return f.headline;
  const lines = f.items.map((i, n) => {
    const t = ctx.db.tasks.find((x) => x.id === i.task.id)!;
    return `${n + 1}. ${ctx.cite.task(t)} — ${i.reason}`;
  });
  return `${f.headline}\n\n${lines.join('\n')}\n\nEverything else can wait until these are moving.`;
}

function answerOverdue(ctx: Ctx): string {
  const { tasks, scope, mine } = scopedTasks(ctx);
  const overdue = tasks
    .filter((t) => t.dueDate && daysUntil(t.dueDate) < 0)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  if (!overdue.length) return `Nothing is overdue in ${scope}.`;
  return `${plural(overdue.length, 'task')} overdue in ${scope}:\n\n${overdue.map((t) => taskLine(ctx, t, { who: !mine })).join('\n')}`;
}

function answerDue(ctx: Ctx): string {
  const { tasks, scope, mine } = scopedTasks(ctx);
  const window = /today/.test(ctx.q) ? 0 : /tomorrow/.test(ctx.q) ? 1 : 6;
  const due = tasks
    .filter((t) => t.dueDate && daysUntil(t.dueDate) <= window)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  const label = window === 0 ? 'today' : window === 1 ? 'by tomorrow' : 'this week';
  if (!due.length) return `Nothing in ${scope} is due ${label}.`;
  const overdue = due.filter((t) => daysUntil(t.dueDate!) < 0).length;
  return `${plural(due.length, 'task')} in ${scope} ${due.length === 1 ? 'is' : 'are'} due ${label}${overdue ? `, including ${overdue} already overdue` : ''}:\n\n${due.map((t) => taskLine(ctx, t, { who: !mine })).join('\n')}`;
}

function answerWorkload(ctx: Ctx): string {
  const { db, user, req, cite } = ctx;
  const teamIds = req.context?.type === 'team' ? [req.context.id] : teamIdsOf(db, user.id);
  const members = [...new Set(db.teams.filter((t) => teamIds.includes(t.id)).flatMap((t) => t.members.map((m) => m.userId)))];
  if (!members.length) return "You're not on a team yet, so there's no workload to compare.";
  const open = visibleTasks(db, user).filter(isOpen);
  const rows = members
    .map((id) => {
      const theirs = open.filter((t) => t.assigneeId === id);
      const week = theirs.filter((t) => t.dueDate && daysUntil(t.dueDate) <= 6);
      const overdue = theirs.filter((t) => t.dueDate && daysUntil(t.dueDate) < 0);
      return { id, open: theirs.length, week: week.length, overdue: overdue.length };
    })
    .sort((a, b) => b.week + b.overdue * 2 - (a.week + a.overdue * 2));
  const heavy = rows.filter((r) => r.week >= 4 || r.overdue >= 2);
  const scope = req.context?.type === 'team' ? req.context.label : 'your teams';
  const lines = rows.map(
    (r) => `- ${cite.user(r.id)} — ${plural(r.week, 'task')} due this week${r.overdue ? ` (${r.overdue} overdue)` : ''}, ${r.open} open in total`,
  );
  const verdict = heavy.length
    ? `${heavy.map((r) => cite.user(r.id)).join(' and ')} ${heavy.length === 1 ? 'looks' : 'look'} stretched this week.`
    : 'Nobody looks overloaded this week.';
  return `${verdict}\n\nWorkload in ${scope}:\n\n${lines.join('\n')}`;
}

function explainTask(ctx: Ctx, t: TaskRecord): string {
  const { db, user, cite } = ctx;
  const parts = [
    `${cite.task(t)} is **${t.status.replace('_', ' ')}**, ${duePhrase(t.dueDate)}, ${t.priority} priority, assigned to ${t.assigneeId ? cite.user(t.assigneeId) : 'nobody yet'}.`,
  ];
  if (t.description) parts.push(t.description);
  const blockers = blockersOf(db, user, t);
  const blocking = blockedBy(db, user, t);
  if (blockers.length) {
    parts.push(`**Blocked by**\n${blockers.map((b) => taskLine(ctx, b, { who: true })).join('\n')}`);
  } else if (t.labels.includes('blocked')) {
    parts.push('It is labeled **blocked**, but no task in Birdy is marked as the blocker. Check the comments.');
  }
  if (blocking.length) {
    parts.push(`**Blocking**\n${blocking.map((b) => taskLine(ctx, b, { who: true })).join('\n')}`);
  }
  const comments = db.comments.filter((c) => c.taskId === t.id).slice(-2);
  if (comments.length) {
    parts.push(`**Latest comments**\n${comments.map((c) => `- ${firstName(db, c.authorId)}: “${c.body}”`).join('\n')}`);
  }
  const files = db.files.filter((f) => t.fileIds.includes(f.id) && !f.deletedAt && fileAccess(db, user, f));
  if (files.length) parts.push(`Linked files: ${files.map((f) => cite.file(f)).join(' ')}`);
  return parts.join('\n\n');
}

function answerBlocked(ctx: Ctx): string {
  const { db, user, req } = ctx;
  if (req.context?.type === 'task') {
    const t = db.tasks.find((x) => x.id === req.context!.id);
    if (t) return explainTask(ctx, t);
  }
  const { tasks, scope } = scopedTasks({ ...ctx, q: ctx.q.replace(/\b(my|me|i)\b/g, '') });
  const blocked = (scope === 'your tasks' ? visibleTasks(db, user).filter(isOpen) : tasks).filter((t) =>
    t.labels.includes('blocked'),
  );
  if (!blocked.length) return `Nothing is marked as blocked in ${scope === 'your tasks' ? 'the workspace' : scope}.`;
  const lines = blocked.map((t) => {
    const by = blockersOf(db, user, t);
    return `${taskLine(ctx, t, { who: true })}${by.length ? `\n  Waiting on ${by.map((b) => `${ctx.cite.task(b)} (${firstName(db, b.assigneeId)})`).join(', ')}` : ''}`;
  });
  return `${plural(blocked.length, 'task is', 'tasks are')} blocked:\n\n${lines.join('\n')}`;
}

function answerStatus(ctx: Ctx): string {
  const { db, user, req, q, cite } = ctx;
  const project =
    (req.context?.type === 'project' && db.projects.find((p) => p.id === req.context!.id)) ||
    db.projects.find((p) => q.includes(p.name.toLowerCase()) || q.includes(p.name.toLowerCase().split(' ')[0]));
  if (!project) return answerFocus(ctx);
  const tasks = visibleTasks(db, user).filter((t) => t.projectId === project.id);
  const open = tasks.filter(isOpen);
  const done = tasks.length - open.length;
  const overdue = open.filter((t) => t.dueDate && daysUntil(t.dueDate) < 0);
  const next = open
    .filter((t) => t.dueDate && daysUntil(t.dueDate) >= 0)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
    .slice(0, 3);
  const verdict = overdue.length >= 3 ? 'at risk' : overdue.length ? 'mostly on track, with a few slips' : 'on track';
  const parts = [
    `**${project.name}** looks ${verdict}: ${done} of ${tasks.length} tasks are done and ${plural(overdue.length, 'is', 'are')} overdue.`,
  ];
  if (overdue.length) parts.push(`**Overdue**\n${overdue.map((t) => taskLine(ctx, t, { who: true })).join('\n')}`);
  if (next.length) parts.push(`**Coming up**\n${next.map((t) => taskLine(ctx, t, { who: true })).join('\n')}`);
  const plan = db.files.find((f) => f.folderId === project.folderId && /plan|brief/i.test(f.name) && fileAccess(db, user, f));
  if (plan) parts.push(`The plan of record is ${cite.file(plan)}.`);
  return parts.join('\n\n');
}

const STOPWORDS = new Set(
  'the a an and or of for to in on at about with find where is are any files file docs doc document documents show me my our we have that this what which please can you look'.split(
    ' ',
  ),
);

function keywords(q: string) {
  return q
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function answerFind(ctx: Ctx): string {
  const { db, user, q, cite } = ctx;
  const words = keywords(q);
  if (!words.length) return 'What should I look for? Try "find files about shipping".';
  const scored = visibleFiles(db, user)
    .map(([f]) => {
      const name = f.name.toLowerCase();
      const body = f.contentText.toLowerCase();
      const score = words.reduce((s, w) => s + (name.includes(w) ? 3 : 0) + (body.includes(w) ? 1 : 0), 0);
      return { f, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  if (!scored.length) return `I couldn't find any files you can open that mention “${words.join(' ')}”.`;
  return `I found ${plural(scored.length, 'file')} about “${words.join(' ')}”:\n\n${scored
    .map(({ f }) => `- ${cite.file(f)} — updated ${format(new Date(f.updatedAt), 'MMM d')} by ${firstName(db, f.updatedById)}`)
    .join('\n')}`;
}

function answerWho(ctx: Ctx): string {
  const { db, user, q, cite } = ctx;
  const words = keywords(q.replace(/\bwho('s| is)?\b|working|owns|owner|responsible|assigned/g, ''));
  const matches = visibleTasks(db, user)
    .filter(isOpen)
    .filter((t) => words.some((w) => t.title.toLowerCase().includes(w) || t.description.toLowerCase().includes(w)))
    .slice(0, 6);
  if (!matches.length) return `I couldn't find open work about “${words.join(' ')}”.`;
  const people = [...new Set(matches.map((t) => t.assigneeId).filter(Boolean))] as ID[];
  return `${people.map((p) => cite.user(p)).join(', ')} ${people.length === 1 ? 'is' : 'are'} on it:\n\n${matches.map((t) => taskLine(ctx, t, { who: true })).join('\n')}`;
}

function contextFile(ctx: Ctx): FileRecord | undefined {
  const { db, user, req, q } = ctx;
  if (req.context?.type === 'file') {
    const f = db.files.find((x) => x.id === req.context!.id && !x.deletedAt);
    if (f && fileAccess(db, user, f)) return f;
  }
  // A file named in the question: most name words present.
  let bestMatch: { f: FileRecord; score: number } | undefined;
  for (const [f] of visibleFiles(db, user)) {
    const words = keywords(f.name.toLowerCase().replace(/\.[a-z]+$/, ''));
    const score = words.filter((w) => q.includes(w)).length / Math.max(words.length, 1);
    if (score >= 0.6 && (!bestMatch || score > bestMatch.score)) bestMatch = { f, score };
  }
  return bestMatch?.f;
}

function help(ctx: Ctx): string {
  const where = ctx.req.context ? ` about **${ctx.req.context.label}**` : '';
  return `I can answer questions${where} from your tasks and files in Birdy. Try:\n\n- What should I focus on today?\n- What's overdue across my teams?\n- Summarize the launch plan\n- What's blocking the Safari autocomplete fix?\n- Who's overloaded this week?\n- Find files about shipping`;
}

export function answer(db: Database, user: User, req: AssistantRequest): AssistantAnswer {
  const q = req.message.toLowerCase().replace(/[’]/g, "'");
  const ctx: Ctx = { db, user, req, q, cite: new Cites(db) };
  const has = (re: RegExp) => re.test(q);
  const file = contextFile(ctx);
  const task = req.context?.type === 'task' ? db.tasks.find((t) => t.id === req.context!.id && canSeeTask(db, user, t)) : undefined;

  let text: string;
  if (file && has(/decision|decided|action item|next step|follow.?up/)) text = decisionsIn(ctx, file);
  else if (file && (has(/summar|tl;?dr|overview|gist|what('s| is) (this|in)|key points|explain|about/) || req.context?.type === 'file'))
    text = summarizeFile(ctx, file);
  else if (has(/block|stuck|waiting on|depend/)) text = answerBlocked(ctx);
  else if (has(/overload|workload|capacity|busy|bandwidth|stretched/)) text = answerWorkload(ctx);
  else if (has(/focus|priorit|what should i|start with|most important|work on (next|today)/)) text = answerFocus(ctx);
  else if (has(/overdue|late|behind|slipp/)) text = answerOverdue(ctx);
  else if (has(/due|this week|today|tomorrow|deadline/)) text = answerDue(ctx);
  else if (has(/status|progress|how is|how's|on track|at risk/)) text = answerStatus(ctx);
  else if (has(/^who|who('s| is) (working|on|doing|responsible)|owns|assigned to/)) text = answerWho(ctx);
  else if (has(/find|where('s| is)|search|look for|files? (about|on|for)|docs? about/)) text = answerFind(ctx);
  else if (task) text = explainTask(ctx, task);
  else if (file) text = summarizeFile(ctx, file);
  else if (req.context?.type === 'team' || req.context?.type === 'person') text = answerDue({ ...ctx, q: `${q} this week` });
  else if (req.context?.type === 'project') text = answerStatus(ctx);
  else text = help(ctx);

  return { text, citations: ctx.cite.list() };
}


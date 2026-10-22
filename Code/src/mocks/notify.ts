// Notifications: who hears about what. Handlers call the `notify*` functions after they
// change something; `listNotifications` and `markRead` back the notification endpoints.
//
//   assigned        you were made the assignee of a task
//   commented       a comment on a task you are assigned to or created
//   mentioned       "@FirstName" in a comment (wins over `commented` for the same comment)
//   status_changed  a task you created changed status
//   shared          a file or folder was shared with you, directly or through a team
//
// Rules for every kind: the actor is never notified of their own action, one event gives
// each person at most one notification, and nobody is notified about something they can't
// see (a guest is only told about tasks that are theirs, and files shared with them).
import type {
  ID,
  NotificationKind,
  NotificationList,
  NotificationRecord,
  NotificationView,
  ShareGrant,
  TaskStatus,
  User,
} from '@/domain/types';
import { mentionedUsers } from '@/lib/mentions';
import { canSeeTask, fileAccess, folderAccess, liveFolder } from './access';
import { newId } from './db';
import type { Database, FileRecord, FolderRecord, TaskRecord } from './db-types';

const EXCERPT_LENGTH = 140;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

type Target = Partial<Pick<NotificationRecord, 'taskId' | 'fileId' | 'folderId' | 'commentId'>>;

export function excerptOf(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > EXCERPT_LENGTH ? `${flat.slice(0, EXCERPT_LENGTH - 1).trimEnd()}…` : flat;
}

/**
 * Store one notification per recipient. The first mention of a person wins, so callers
 * list the more specific kinds first. Returns what was created.
 */
function emit(
  db: Database,
  actor: User,
  recipients: Array<{ userId: ID | null; kind: NotificationKind }>,
  target: Target,
  excerpt?: string,
  canSee: (user: User) => boolean = () => true,
): NotificationRecord[] {
  const createdAt = new Date().toISOString();
  const seen = new Set<ID>([actor.id]);
  const created: NotificationRecord[] = [];
  for (const { userId, kind } of recipients) {
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);
    const recipient = db.users.find((u) => u.id === userId);
    if (!recipient || !canSee(recipient)) continue;
    created.push({
      id: newId('nt'),
      userId,
      kind,
      actorId: actor.id,
      ...target,
      ...(excerpt ? { excerpt } : {}),
      createdAt,
      readAt: null,
    });
  }
  db.notifications.push(...created);
  return created;
}

/** Someone made `task.assigneeId` the assignee. */
export function notifyAssigned(db: Database, actor: User, task: TaskRecord) {
  return emit(
    db,
    actor,
    [{ userId: task.assigneeId, kind: 'assigned' }],
    { taskId: task.id },
    undefined,
    (u) => canSeeTask(db, u, task),
  );
}

/** A comment was posted: mentions first, then the task's assignee and creator. */
export function notifyComment(
  db: Database,
  actor: User,
  task: TaskRecord,
  comment: { id: ID; body: string },
) {
  const recipients = [
    ...mentionedUsers(comment.body, db.users).map((u) => ({
      userId: u.id,
      kind: 'mentioned' as const,
    })),
    { userId: task.assigneeId, kind: 'commented' as const },
    { userId: task.createdById, kind: 'commented' as const },
  ];
  return emit(
    db,
    actor,
    recipients,
    { taskId: task.id, commentId: comment.id },
    excerptOf(comment.body),
    (u) => canSeeTask(db, u, task),
  );
}

/** A task's status changed. Its creator hears about it. */
export function notifyStatusChanged(db: Database, actor: User, task: TaskRecord, to: TaskStatus) {
  return emit(
    db,
    actor,
    [{ userId: task.createdById, kind: 'status_changed' }],
    { taskId: task.id },
    to,
    (u) => canSeeTask(db, u, task),
  );
}

/** Everyone a set of grants reaches: named users plus every member of a granted team. */
function grantees(db: Database, grants: ShareGrant[]): Set<ID> {
  const ids = new Set<ID>();
  for (const g of grants) {
    if (g.principalType === 'user') ids.add(g.principalId);
    else db.teams.find((t) => t.id === g.principalId)?.members.forEach((m) => ids.add(m.userId));
  }
  return ids;
}

/**
 * A file or folder's grants changed from `before` to `after`. People newly reached are
 * told, once, even when both a user grant and a team grant reach them. The owner is not.
 */
export function notifyShared(
  db: Database,
  actor: User,
  resource: { type: 'file'; record: FileRecord } | { type: 'folder'; record: FolderRecord },
  before: ShareGrant[],
  after: ShareGrant[],
) {
  const already = grantees(db, before);
  const fresh = [...grantees(db, after)].filter(
    (id) => !already.has(id) && id !== resource.record.ownerId,
  );
  const target: Target =
    resource.type === 'file' ? { fileId: resource.record.id } : { folderId: resource.record.id };
  return emit(
    db,
    actor,
    fresh.map((userId) => ({ userId, kind: 'shared' as const })),
    target,
  );
}

// ---- Reading ---------------------------------------------------------------------------

/** The title to show, or null when the user can no longer see what it is about. */
function titleFor(db: Database, user: User, n: NotificationRecord): string | null {
  if (n.taskId) {
    const task = db.tasks.find((t) => t.id === n.taskId);
    return task && canSeeTask(db, user, task) ? task.title : null;
  }
  if (n.fileId) {
    const file = db.files.find((f) => f.id === n.fileId && !f.deletedAt);
    return file && fileAccess(db, user, file) ? file.name : null;
  }
  if (n.folderId) {
    const folder = liveFolder(db, n.folderId);
    return folder && folderAccess(db, user, folder) ? folder.name : null;
  }
  return null;
}

/** The user's notifications, newest first, skipping anything they can no longer see. */
export function listNotifications(db: Database, user: User, requested?: number): NotificationList {
  const limit = Math.min(MAX_LIMIT, Math.max(1, requested || DEFAULT_LIMIT));
  const visible: NotificationView[] = [];
  for (const n of db.notifications) {
    if (n.userId !== user.id) continue;
    const title = titleFor(db, user, n);
    if (title === null) continue;
    const { userId: _userId, excerpt, ...rest } = n;
    visible.push({
      ...rest,
      title,
      ...(n.kind === 'status_changed' ? { status: excerpt as TaskStatus } : {}),
      ...(n.kind === 'commented' || n.kind === 'mentioned' ? { excerpt } : {}),
    });
  }
  visible.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    items: visible.slice(0, limit),
    unreadCount: visible.filter((n) => !n.readAt).length,
  };
}

/** Mark some (or all) of the user's own notifications read. */
export function markRead(db: Database, user: User, which: { ids: ID[] } | { all: true }) {
  const readAt = new Date().toISOString();
  for (const n of db.notifications) {
    if (n.userId !== user.id || n.readAt) continue;
    if ('all' in which || which.ids.includes(n.id)) n.readAt = readAt;
  }
}

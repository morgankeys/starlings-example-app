// The Home activity feed: what other people did that matters to this user.
//
// Relevant means a task assigned to or created by the user, a task in a project run by one
// of the user's teams, or a file the user can see that someone else edited in the last two
// weeks. Events come from task activity, comments and file updates. The user's own actions
// are left out, and so is anything they can't see: guests only get activity on their own
// tasks and on files shared with them.
import { subDays } from 'date-fns';
import type { ActivityFeedItem, User } from '@/domain/types';
import { canSeeTask, folderAccess, liveFolder, teamIdsOf, visibleFiles } from './access';
import type { Database, TaskRecord } from './db-types';
import { excerptOf } from './notify';

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 50;
const FILE_WINDOW_DAYS = 14;

export function buildActivityFeed(
  db: Database,
  user: User,
  requested?: number,
): ActivityFeedItem[] {
  const limit = Math.min(MAX_LIMIT, Math.max(1, requested || DEFAULT_LIMIT));
  const items: ActivityFeedItem[] = [];

  const teamProjects = new Set(
    db.projects.filter((p) => teamIdsOf(db, user.id).includes(p.teamId)).map((p) => p.id),
  );
  const tasks = new Map<string, TaskRecord>();
  for (const t of db.tasks) {
    const mine = t.assigneeId === user.id || t.createdById === user.id;
    const inMyProject = !!t.projectId && teamProjects.has(t.projectId);
    if (canSeeTask(db, user, t) && (mine || inMyProject)) tasks.set(t.id, t);
  }

  for (const e of db.activity) {
    const task = tasks.get(e.taskId);
    if (!task || e.actorId === user.id) continue;
    const detail =
      e.kind === 'assignee'
        ? db.users.find((u) => u.id === e.to)?.name
        : e.kind === 'file_unlinked'
          ? e.from
          : e.kind === 'status' ||
              e.kind === 'priority' ||
              e.kind === 'due' ||
              e.kind === 'file_linked'
            ? e.to
            : null;
    items.push({
      id: e.id,
      kind: e.kind,
      actorId: e.actorId,
      taskId: task.id,
      title: task.title,
      ...(detail ? { detail } : {}),
      createdAt: e.createdAt,
    });
  }

  for (const c of db.comments) {
    const task = tasks.get(c.taskId);
    if (!task || c.authorId === user.id) continue;
    items.push({
      id: c.id,
      kind: 'comment',
      actorId: c.authorId,
      taskId: task.id,
      title: task.title,
      detail: excerptOf(c.body),
      createdAt: c.createdAt,
    });
  }

  const since = subDays(new Date(), FILE_WINDOW_DAYS).toISOString();
  for (const [file] of visibleFiles(db, user)) {
    if (file.updatedById === user.id || file.updatedAt < since) continue;
    // Name the folder only when the user can open it (a guest may see just the file).
    const folder = liveFolder(db, file.folderId);
    const showFolder = folder && folderAccess(db, user, folder);
    items.push({
      id: `fe_${file.id}`,
      kind: 'file_edited',
      actorId: file.updatedById,
      fileId: file.id,
      title: file.name,
      ...(showFolder ? { detail: folder.name } : {}),
      createdAt: file.updatedAt,
    });
  }

  return items
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
    .slice(0, limit);
}

// Permissions and serializers for the mock backend.
//
// Files and folders: access is the strongest of
//   - ownership (owner), org admin (edit),
//   - a grant to the user or to a team they belong to,
//   - general access (org_view / org_edit) for members (never for guests),
//   - the same, inherited from every ancestor folder.
// Tasks: members see every task; guests see tasks assigned to or created by them.
import type {
  Access,
  AccessEntry,
  Breadcrumb,
  FileItem,
  Folder,
  ID,
  ShareGrant,
  Task,
  User,
} from '@/domain/types';
import type { Database, FileRecord, FolderRecord, TaskRecord } from './db-types';

const RANK: Record<Access, number> = { view: 1, edit: 2, owner: 3 };
const best = (a: Access | null, b: Access | null): Access | null =>
  !a ? b : !b ? a : RANK[a] >= RANK[b] ? a : b;

export function teamIdsOf(db: Database, userId: ID): ID[] {
  return db.teams.filter((t) => t.members.some((m) => m.userId === userId)).map((t) => t.id);
}

interface Resource {
  ownerId: ID;
  generalAccess: FolderRecord['generalAccess'];
  grants: ShareGrant[];
}

function directAccess(db: Database, user: User, r: Resource): Access | null {
  if (r.ownerId === user.id) return 'owner';
  let access: Access | null = user.role === 'admin' ? 'edit' : null;
  const myTeams = teamIdsOf(db, user.id);
  for (const g of r.grants) {
    const mine =
      (g.principalType === 'user' && g.principalId === user.id) ||
      (g.principalType === 'team' && myTeams.includes(g.principalId));
    if (mine) access = best(access, g.level);
  }
  if (user.role !== 'guest') {
    if (r.generalAccess === 'org_edit') access = best(access, 'edit');
    if (r.generalAccess === 'org_view') access = best(access, 'view');
  }
  return access;
}

export function liveFolder(db: Database, id: ID | null): FolderRecord | undefined {
  return db.folders.find((f) => f.id === id && !f.deletedAt);
}

/**
 * The workspace root ("All files") is a container: every member can open it and add to
 * it, but that access does not flow down, so top-level folders can be private.
 */
const rootAccess = (user: User): Access | null => (user.role === 'guest' ? null : 'edit');

export function folderAccess(db: Database, user: User, folder: FolderRecord): Access | null {
  if (folder.parentId === null) return rootAccess(user);
  let access = directAccess(db, user, folder);
  const parent = liveFolder(db, folder.parentId);
  if (parent && parent.parentId !== null) {
    const inherited = folderAccess(db, user, parent);
    // Ownership of a parent means edit rights below it, not ownership.
    access = best(access, inherited === 'owner' ? 'edit' : inherited);
  }
  return access;
}

export function fileAccess(db: Database, user: User, file: FileRecord): Access | null {
  let access = directAccess(db, user, file);
  const folder = liveFolder(db, file.folderId);
  if (folder) {
    const inherited = folderAccess(db, user, folder);
    access = best(access, inherited === 'owner' ? 'edit' : inherited);
  }
  return access;
}

export const canEdit = (a: Access | null) => a === 'edit' || a === 'owner';

export function canSeeTask(_db: Database, user: User, t: TaskRecord): boolean {
  if (t.deletedAt) return false;
  if (user.role !== 'guest') return true;
  return t.assigneeId === user.id || t.createdById === user.id;
}

export const canEditTask = (db: Database, user: User, t: TaskRecord) =>
  canSeeTask(db, user, t) && (user.role !== 'guest' || t.assigneeId === user.id);

/** Admins and team leads manage team membership. */
export function canManageTeam(db: Database, user: User, teamId: ID): boolean {
  if (user.role === 'admin') return true;
  const team = db.teams.find((t) => t.id === teamId);
  return !!team?.members.some((m) => m.userId === user.id && m.role === 'lead');
}

export function folderPath(db: Database, folderId: ID): Breadcrumb[] {
  const path: Breadcrumb[] = [];
  let current = liveFolder(db, folderId);
  while (current) {
    path.unshift({ id: current.id, name: current.name });
    current = current.parentId ? liveFolder(db, current.parentId) : undefined;
  }
  return path;
}

/** Everyone with access to a resource, and where their access comes from. */
export function accessEntries(
  db: Database,
  resource: Resource,
  parentFolderId: ID | null,
): AccessEntry[] {
  const entries: AccessEntry[] = [
    { principalType: 'user', principalId: resource.ownerId, level: 'owner', inheritedFrom: null },
  ];
  const push = (r: Resource, from: Breadcrumb | null) => {
    for (const g of r.grants) {
      entries.push({
        principalType: g.principalType,
        principalId: g.principalId,
        level: g.level,
        inheritedFrom: from,
      });
    }
    if (r.generalAccess !== 'restricted') {
      entries.push({
        principalType: 'org',
        principalId: db.org.id,
        level: r.generalAccess === 'org_edit' ? 'edit' : 'view',
        inheritedFrom: from,
      });
    }
  };
  push(resource, null);
  let current = parentFolderId ? liveFolder(db, parentFolderId) : undefined;
  // Stop at the root: its access does not flow down (see rootAccess).
  while (current && current.parentId !== null) {
    push(current, { id: current.id, name: current.name });
    current = current.parentId ? liveFolder(db, current.parentId) : undefined;
  }
  return entries;
}

// ---- Serializers -----------------------------------------------------------------------

export function toTask(db: Database, t: TaskRecord): Task {
  const { deletedAt: _deletedAt, ...task } = t;
  return { ...task, commentCount: db.comments.filter((c) => c.taskId === t.id).length };
}

export function toFolder(
  db: Database,
  user: User,
  f: FolderRecord,
  access?: Access | null,
): Folder {
  const { deletedAt: _deletedAt, ...folder } = f;
  const itemCount =
    db.folders.filter((c) => c.parentId === f.id && !c.deletedAt).length +
    db.files.filter((c) => c.folderId === f.id && !c.deletedAt).length;
  return { ...folder, itemCount, access: access ?? folderAccess(db, user, f) ?? 'view' };
}

export function toFile(db: Database, user: User, f: FileRecord, access?: Access | null): FileItem {
  const { deletedAt: _deletedAt, contentText: _contentText, ...file } = f;
  return {
    ...file,
    access: access ?? fileAccess(db, user, f) ?? 'view',
    starred: (db.stars[user.id] ?? []).includes(f.id),
    linkedTaskCount: db.tasks.filter((t) => !t.deletedAt && t.fileIds.includes(f.id)).length,
  };
}

/** Files the user can see, with their access. */
export function visibleFiles(db: Database, user: User): Array<[FileRecord, Access]> {
  const out: Array<[FileRecord, Access]> = [];
  for (const f of db.files) {
    if (f.deletedAt) continue;
    const a = fileAccess(db, user, f);
    if (a) out.push([f, a]);
  }
  return out;
}

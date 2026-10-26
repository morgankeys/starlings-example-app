import { http } from 'msw';
import type {
  FileDetail,
  FileKind,
  FileView,
  FolderView,
  GeneralAccess,
  ShareGrant,
  ShareSettings,
  User,
} from '@/domain/types';
import {
  accessEntries,
  canEdit,
  canSeeTask,
  fileAccess,
  folderAccess,
  folderPath,
  liveFolder,
  teamIdsOf,
  toFile,
  toFolder,
  toTask,
  visibleFiles,
} from '../access';
import { newId } from '../db';
import type { Database, FileRecord, FolderRecord } from '../db-types';
import { API, badRequest, body, forbidden, notFound, now, route } from '../http';
import { notifyShared } from '../notify';

const ROOT_ID = 'fd_root';

function findFolder(db: Database, user: User, id: string) {
  const folder = liveFolder(db, id === 'root' ? ROOT_ID : id);
  const access = folder && folderAccess(db, user, folder);
  if (!folder || !access) throw notFound('Folder');
  return { folder, access };
}

function findFile(db: Database, user: User, id: string) {
  const file = db.files.find((f) => f.id === id && !f.deletedAt);
  const access = file && fileAccess(db, user, file);
  if (!file || !access) throw notFound('File');
  return { file, access };
}

/** Breadcrumbs, trimmed to the folders the user can open. */
function visiblePath(db: Database, user: User, folderId: string) {
  const path = folderPath(db, folderId);
  const firstVisible = path.findIndex((p) => {
    const f = liveFolder(db, p.id);
    return f && folderAccess(db, user, f);
  });
  return firstVisible === -1 ? [] : path.slice(firstVisible);
}

function folderView(db: Database, user: User, id: string): FolderView {
  const { folder, access } = findFolder(db, user, id);
  const folders = db.folders
    .filter((f) => f.parentId === folder.id && !f.deletedAt)
    .map((f) => [f, folderAccess(db, user, f)] as const)
    .filter(([, a]) => a)
    .map(([f, a]) => toFolder(db, user, f, a))
    .sort((a, b) => a.name.localeCompare(b.name));
  const files = db.files
    .filter((f) => f.folderId === folder.id && !f.deletedAt)
    .map((f) => [f, fileAccess(db, user, f)] as const)
    .filter(([, a]) => a)
    .map(([f, a]) => toFile(db, user, f, a))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return {
    folder: toFolder(db, user, folder, access),
    path: visiblePath(db, user, folder.id),
    folders,
    files,
  };
}

function fileDetail(db: Database, user: User, file: FileRecord): FileDetail {
  const access = fileAccess(db, user, file);
  return {
    ...toFile(db, user, file, access),
    contentText: file.contentText,
    path: visiblePath(db, user, file.folderId),
    linkedTasks: db.tasks
      .filter((t) => t.fileIds.includes(file.id) && canSeeTask(db, user, t))
      .map((t) => toTask(db, t)),
  };
}

function isDescendant(db: Database, folderId: string, ancestorId: string): boolean {
  let current = liveFolder(db, folderId);
  while (current) {
    if (current.id === ancestorId) return true;
    current = current.parentId ? liveFolder(db, current.parentId) : undefined;
  }
  return false;
}

function shareSettings(
  db: Database,
  user: User,
  type: 'file' | 'folder',
  resource: FileRecord | FolderRecord,
): ShareSettings {
  const parentId =
    type === 'file' ? (resource as FileRecord).folderId : (resource as FolderRecord).parentId;
  const access =
    type === 'file'
      ? fileAccess(db, user, resource as FileRecord)
      : folderAccess(db, user, resource as FolderRecord);
  return {
    resourceType: type,
    resourceId: resource.id,
    name: resource.name,
    ownerId: resource.ownerId,
    generalAccess: resource.generalAccess,
    grants: resource.grants,
    inherited: accessEntries(db, resource, parentId).filter((e) => e.inheritedFrom),
    canManage: canEdit(access) && user.role !== 'guest',
  };
}

const KIND_BY_EXT: Record<string, FileKind> = {
  doc: 'doc',
  docx: 'doc',
  txt: 'doc',
  md: 'doc',
  pages: 'doc',
  xls: 'sheet',
  xlsx: 'sheet',
  csv: 'sheet',
  numbers: 'sheet',
  ppt: 'slides',
  pptx: 'slides',
  key: 'slides',
  pdf: 'pdf',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  heic: 'image',
};

export const fileHandlers = [
  http.get(
    `${API}/folders/tree`,
    route(({ db, user }) =>
      db.folders
        .filter((f) => !f.deletedAt)
        .map((f) => [f, folderAccess(db, user, f)] as const)
        .filter(([, a]) => a)
        .map(([f, a]) => toFolder(db, user, f, a)),
    ),
  ),

  http.get<{ id: string }>(
    `${API}/folders/:id`,
    route(({ db, user, params }) => folderView(db, user, params.id)),
  ),

  http.post(
    `${API}/folders`,
    route(async ({ db, user, request }) => {
      const input = await body<{ name: string; parentId: string }>(request);
      const { folder: parent, access } = findFolder(db, user, input.parentId);
      if (!canEdit(access)) throw forbidden(`You can only view “${parent.name}”`);
      const name = input.name?.trim();
      if (!name) throw badRequest('Give the folder a name');
      const folder: FolderRecord = {
        id: newId('fd'),
        name,
        parentId: parent.id,
        ownerId: user.id,
        projectId: parent.projectId,
        generalAccess: 'restricted',
        grants: [],
        createdAt: now(),
        updatedAt: now(),
        deletedAt: null,
      };
      db.folders.push(folder);
      return toFolder(db, user, folder);
    }),
  ),

  http.patch<{ id: string }>(
    `${API}/folders/:id`,
    route(async ({ db, user, params, request }) => {
      const { folder, access } = findFolder(db, user, params.id);
      if (!canEdit(access)) throw forbidden('You can only view this folder');
      if (folder.id === ROOT_ID) throw badRequest("The workspace root can't be changed");
      const patch = await body<{ name?: string; parentId?: string }>(request);
      if (patch.name !== undefined) {
        if (!patch.name.trim()) throw badRequest('Give the folder a name');
        folder.name = patch.name.trim();
      }
      if (patch.parentId) {
        const { access: targetAccess } = findFolder(db, user, patch.parentId);
        if (!canEdit(targetAccess)) throw forbidden("You can't add to that folder");
        if (isDescendant(db, patch.parentId, folder.id))
          throw badRequest("A folder can't move inside itself");
        folder.parentId = patch.parentId;
      }
      folder.updatedAt = now();
      return toFolder(db, user, folder);
    }),
  ),

  http.delete<{ id: string }>(
    `${API}/folders/:id`,
    route(({ db, user, params }) => {
      const { folder, access } = findFolder(db, user, params.id);
      if (!canEdit(access) || folder.id === ROOT_ID)
        throw forbidden("You can't delete this folder");
      folder.deletedAt = now();
      return null;
    }),
  ),

  http.post<{ id: string }>(
    `${API}/folders/:id/restore`,
    route(({ db, user, params }) => {
      const folder = db.folders.find((f) => f.id === params.id);
      if (!folder) throw notFound('Folder');
      folder.deletedAt = null;
      return toFolder(db, user, folder);
    }),
  ),

  http.get(
    `${API}/files`,
    route(({ db, user, url }) => {
      const view = (url.searchParams.get('view') ?? 'recent') as FileView;
      const limit = Number(url.searchParams.get('limit') ?? 50);
      const files = visibleFiles(db, user);
      const myTeams = teamIdsOf(db, user.id);
      const sharedDirectly = (r: FileRecord | FolderRecord) =>
        r.ownerId !== user.id &&
        r.grants.some(
          (g) =>
            (g.principalType === 'user' && g.principalId === user.id) ||
            (g.principalType === 'team' && myTeams.includes(g.principalId)),
        );

      let result: Array<[FileRecord, ReturnType<typeof fileAccess>]>;
      if (view === 'all') {
        result = files;
      } else if (view === 'starred') {
        const stars = db.stars[user.id] ?? [];
        result = files.filter(([f]) => stars.includes(f.id));
      } else if (view === 'shared') {
        // Shared with me: a grant names me or my team, on the file or any folder above it.
        result = files.filter(([f]) => {
          if (f.ownerId === user.id) return false;
          if (sharedDirectly(f)) return true;
          let folder = liveFolder(db, f.folderId);
          while (folder) {
            if (sharedDirectly(folder)) return true;
            folder = folder.parentId ? liveFolder(db, folder.parentId) : undefined;
          }
          return false;
        });
      } else {
        const opens = db.opens[user.id] ?? {};
        const touched = (f: FileRecord) =>
          opens[f.id] ?? (f.updatedById === user.id ? f.updatedAt : '');
        result = files
          .filter(([f]) => touched(f) || user.role === 'guest')
          .sort(([a], [b]) => (touched(b) || b.updatedAt).localeCompare(touched(a) || a.updatedAt));
        if (result.length < 6) {
          const extra = files
            .filter(([f]) => !result.some(([r]) => r.id === f.id))
            .sort(([a], [b]) => b.updatedAt.localeCompare(a.updatedAt));
          result = [...result, ...extra];
        }
      }
      if (view !== 'recent') result.sort(([a], [b]) => b.updatedAt.localeCompare(a.updatedAt));
      return result.slice(0, limit).map(([f, a]) => toFile(db, user, f, a));
    }),
  ),

  http.get<{ id: string }>(
    `${API}/files/:id`,
    route(({ db, user, params }) => {
      const { file } = findFile(db, user, params.id);
      db.opens[user.id] = { ...(db.opens[user.id] ?? {}), [file.id]: now() };
      return fileDetail(db, user, file);
    }),
  ),

  /** Simulated upload: the browser keeps the bytes; we keep a record. */
  http.post(
    `${API}/files`,
    route(async ({ db, user, request }) => {
      const input = await body<{ name: string; folderId: string; size: number }>(request);
      const { folder, access } = findFolder(db, user, input.folderId);
      if (!canEdit(access)) throw forbidden(`You can only view “${folder.name}”`);
      const ext = input.name.split('.').pop()?.toLowerCase() ?? '';
      const file: FileRecord = {
        id: newId('fl'),
        name: input.name,
        kind: KIND_BY_EXT[ext] ?? 'doc',
        folderId: folder.id,
        ownerId: user.id,
        size: input.size,
        generalAccess: 'restricted',
        grants: [],
        createdAt: now(),
        updatedAt: now(),
        updatedById: user.id,
        version: 1,
        contentText: '',
        deletedAt: null,
      };
      db.files.push(file);
      db.opens[user.id] = { ...(db.opens[user.id] ?? {}), [file.id]: now() };
      return toFile(db, user, file);
    }),
  ),

  http.patch<{ id: string }>(
    `${API}/files/:id`,
    route(async ({ db, user, params, request }) => {
      const { file, access } = findFile(db, user, params.id);
      const patch = await body<{ name?: string; folderId?: string; starred?: boolean }>(request);
      if (patch.starred !== undefined) {
        const stars = new Set(db.stars[user.id] ?? []);
        if (patch.starred) stars.add(file.id);
        else stars.delete(file.id);
        db.stars[user.id] = [...stars];
      }
      if (patch.name !== undefined || patch.folderId !== undefined) {
        if (!canEdit(access)) throw forbidden('You can only view this file');
        if (patch.name !== undefined) {
          if (!patch.name.trim()) throw badRequest('Give the file a name');
          file.name = patch.name.trim();
        }
        if (patch.folderId) {
          const { access: targetAccess } = findFolder(db, user, patch.folderId);
          if (!canEdit(targetAccess)) throw forbidden("You can't add to that folder");
          file.folderId = patch.folderId;
        }
        file.updatedAt = now();
        file.updatedById = user.id;
      }
      return toFile(db, user, file);
    }),
  ),

  http.delete<{ id: string }>(
    `${API}/files/:id`,
    route(({ db, user, params }) => {
      const { file, access } = findFile(db, user, params.id);
      if (!canEdit(access)) throw forbidden("You can't delete this file");
      file.deletedAt = now();
      return null;
    }),
  ),

  http.post<{ id: string }>(
    `${API}/files/:id/restore`,
    route(({ db, user, params }) => {
      const file = db.files.find((f) => f.id === params.id);
      if (!file) throw notFound('File');
      file.deletedAt = null;
      return toFile(db, user, file);
    }),
  ),

  // ---- Sharing ------------------------------------------------------------------------
  http.get<{ type: 'file' | 'folder'; id: string }>(
    `${API}/shares/:type/:id`,
    route(({ db, user, params }) => {
      const resource =
        params.type === 'file'
          ? findFile(db, user, params.id).file
          : findFolder(db, user, params.id).folder;
      return shareSettings(db, user, params.type, resource);
    }),
  ),

  http.put<{ type: 'file' | 'folder'; id: string }>(
    `${API}/shares/:type/:id`,
    route(async ({ db, user, params, request }) => {
      const resource =
        params.type === 'file'
          ? findFile(db, user, params.id).file
          : findFolder(db, user, params.id).folder;
      if (!shareSettings(db, user, params.type, resource).canManage) {
        throw forbidden('Only people who can edit can change sharing');
      }
      const input = await body<{ generalAccess: GeneralAccess; grants: ShareGrant[] }>(request);
      if (!['restricted', 'org_view', 'org_edit'].includes(input.generalAccess))
        throw badRequest('Unknown access');
      const before = resource.grants;
      resource.generalAccess = input.generalAccess;
      resource.grants = input.grants.filter(
        (g) => !(g.principalType === 'user' && g.principalId === resource.ownerId),
      );
      notifyShared(
        db,
        user,
        params.type === 'file'
          ? { type: 'file', record: resource as FileRecord }
          : { type: 'folder', record: resource as FolderRecord },
        before,
        resource.grants,
      );
      // Sharing is not an edit: files keep their last-edited time (the Home feed reads it).
      if (params.type === 'folder') resource.updatedAt = now();
      return shareSettings(db, user, params.type, resource);
    }),
  ),
];

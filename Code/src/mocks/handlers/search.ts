import { http } from 'msw';
import type { SearchResult } from '@/domain/types';
import { canSeeTask, folderAccess, visibleFiles } from '../access';
import { API, route } from '../http';

const STATUS_LABEL = { todo: 'To do', in_progress: 'In progress', in_review: 'In review', done: 'Done' };

export const searchHandlers = [
  http.get(
    `${API}/search`,
    route(({ db, user, url }) => {
      const q = url.searchParams.get('q')?.toLowerCase().trim() ?? '';
      if (!q) return [];
      const match = (...fields: string[]) => fields.some((f) => f.toLowerCase().includes(q));
      const name = (id: string | null) => db.users.find((u) => u.id === id)?.name ?? 'Unassigned';
      const results: SearchResult[] = [];

      for (const t of db.tasks) {
        if (canSeeTask(db, user, t) && match(t.title, t.labels.join(' '))) {
          results.push({ type: 'task', id: t.id, title: t.title, subtitle: `${STATUS_LABEL[t.status]} · ${name(t.assigneeId)}` });
        }
      }
      for (const [f] of visibleFiles(db, user)) {
        if (match(f.name, f.contentText)) {
          const folder = db.folders.find((d) => d.id === f.folderId);
          results.push({ type: 'file', id: f.id, title: f.name, subtitle: folder?.name ?? '' });
        }
      }
      for (const f of db.folders) {
        if (!f.deletedAt && f.parentId && match(f.name) && folderAccess(db, user, f)) {
          results.push({ type: 'folder', id: f.id, title: f.name, subtitle: 'Folder' });
        }
      }
      for (const u of db.users) {
        if (match(u.name, u.title, u.email)) results.push({ type: 'user', id: u.id, title: u.name, subtitle: u.title });
      }
      if (user.role !== 'guest') {
        for (const t of db.teams) {
          if (match(t.name)) results.push({ type: 'team', id: t.id, title: t.name, subtitle: `${t.members.length} members` });
        }
        for (const p of db.projects) {
          if (match(p.name)) results.push({ type: 'project', id: p.id, title: p.name, subtitle: 'Project' });
        }
      }
      return results.slice(0, 30);
    }),
  ),
];

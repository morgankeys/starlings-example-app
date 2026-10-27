// One function per API endpoint. Feature hooks call these; components never call fetch.
import type {
  AccentColor,
  ActionsResult,
  AssistantThread,
  AssistantThreadSummary,
  ActivityFeedItem,
  FileDetail,
  FileItem,
  FileView,
  Folder,
  FolderView,
  FocusSummary,
  GeneralAccess,
  BulkTaskResult,
  BulkTaskUpdate,
  NewMember,
  NewTask,
  NotificationList,
  Organization,
  ProjectSummary,
  SearchResult,
  Session,
  ShareGrant,
  ShareSettings,
  Task,
  TaskDetail,
  TaskFilters,
  TaskPatch,
  TeamRole,
  TeamSummary,
  User,
  UserPatch,
} from '@/domain/types';
import { api } from './client';

export interface DemoSettings {
  latency: 'none' | 'realistic' | 'slow';
  failRequests: boolean;
}

export const sessionApi = {
  get: () => api.get<Session>('/session'),
  people: () => api.get<{ org: Organization; users: User[] }>('/session/people'),
  signIn: (userId: string) => api.post<Session>('/session', { userId }),
  signOut: () => api.delete('/session'),
};

export const demoApi = {
  settings: () => api.get<DemoSettings>('/__demo/settings'),
  update: (patch: Partial<DemoSettings>) => api.put<DemoSettings>('/__demo/settings', patch),
  reset: (mode: 'seed' | 'empty') => api.post<{ ok: true }>('/__demo/reset', { mode }),
};

export const usersApi = {
  list: () => api.get<User[]>('/users'),
  get: (id: string) => api.get<User>(`/users/${id}`),
  invite: (input: NewMember) => api.post<User>('/users', input),
  update: (id: string, patch: UserPatch) => api.patch<User>(`/users/${id}`, patch),
};

export const orgApi = {
  update: (input: { name: string }) => api.patch<Organization>('/org', input),
};

export type TeamDetail = TeamSummary & { canManage: boolean };

export const teamsApi = {
  list: (mine = false) => api.get<TeamSummary[]>('/teams', { mine: mine || undefined }),
  get: (id: string) => api.get<TeamDetail>(`/teams/${id}`),
  create: (input: { name: string; description?: string; color?: AccentColor }) =>
    api.post<TeamSummary>('/teams', input),
  addMember: (teamId: string, userId: string, role: TeamRole = 'member') =>
    api.post<TeamSummary>(`/teams/${teamId}/members`, { userId, role }),
  setRole: (teamId: string, userId: string, role: TeamRole) =>
    api.patch<TeamSummary>(`/teams/${teamId}/members/${userId}`, { role }),
  removeMember: (teamId: string, userId: string) =>
    api.delete<TeamSummary>(`/teams/${teamId}/members/${userId}`),
};

export const projectsApi = {
  list: () => api.get<ProjectSummary[]>('/projects'),
  get: (id: string) => api.get<ProjectSummary>(`/projects/${id}`),
};

export const tasksApi = {
  list: (f: TaskFilters = {}) =>
    api.get<Task[]>('/tasks', {
      assignee: f.assignee,
      team: f.team,
      project: f.project,
      status: f.status,
      priority: f.priority,
      due: f.due,
      q: f.q,
      includeDone: f.includeDone === false ? false : undefined,
    }),
  get: (id: string) => api.get<TaskDetail>(`/tasks/${id}`),
  create: (input: NewTask) => api.post<TaskDetail>('/tasks', input),
  bulkUpdate: (updates: BulkTaskUpdate[]) => api.post<BulkTaskResult>('/tasks/bulk', { updates }),
  bulkRemove: (ids: string[]) => api.post<BulkTaskResult>('/tasks/bulk-delete', { ids }),
  bulkRestore: (ids: string[]) => api.post<BulkTaskResult>('/tasks/bulk-restore', { ids }),
  update: (id: string, patch: TaskPatch) => api.patch<TaskDetail>(`/tasks/${id}`, patch),
  remove: (id: string) => api.delete(`/tasks/${id}`),
  restore: (id: string) => api.post<TaskDetail>(`/tasks/${id}/restore`),
  comment: (id: string, body: string) => api.post<TaskDetail>(`/tasks/${id}/comments`, { body }),
  linkFile: (id: string, fileId: string) => api.post<TaskDetail>(`/tasks/${id}/files`, { fileId }),
  unlinkFile: (id: string, fileId: string) =>
    api.delete<TaskDetail>(`/tasks/${id}/files/${fileId}`),
};

export const filesApi = {
  folder: (id: string) => api.get<FolderView>(`/folders/${id}`),
  tree: () => api.get<Folder[]>('/folders/tree'),
  createFolder: (parentId: string, name: string) =>
    api.post<Folder>('/folders', { parentId, name }),
  updateFolder: (id: string, patch: { name?: string; parentId?: string }) =>
    api.patch<Folder>(`/folders/${id}`, patch),
  deleteFolder: (id: string) => api.delete(`/folders/${id}`),
  restoreFolder: (id: string) => api.post<Folder>(`/folders/${id}/restore`),
  list: (view: FileView, limit?: number) => api.get<FileItem[]>('/files', { view, limit }),
  get: (id: string) => api.get<FileDetail>(`/files/${id}`),
  upload: (folderId: string, file: { name: string; size: number }) =>
    api.post<FileItem>('/files', { folderId, name: file.name, size: file.size }),
  update: (id: string, patch: { name?: string; folderId?: string; starred?: boolean }) =>
    api.patch<FileItem>(`/files/${id}`, patch),
  remove: (id: string) => api.delete(`/files/${id}`),
  restore: (id: string) => api.post<FileItem>(`/files/${id}/restore`),
};

export const sharesApi = {
  get: (type: 'file' | 'folder', id: string) => api.get<ShareSettings>(`/shares/${type}/${id}`),
  update: (
    type: 'file' | 'folder',
    id: string,
    input: { generalAccess: GeneralAccess; grants: ShareGrant[] },
  ) => api.put<ShareSettings>(`/shares/${type}/${id}`, input),
};

export const searchApi = {
  search: (q: string, signal?: AbortSignal) => api.get<SearchResult[]>('/search', { q }, signal),
};

export const assistantApi = {
  focus: () => api.get<FocusSummary>('/assistant/focus'),
  threads: () => api.get<AssistantThreadSummary[]>('/assistant/threads'),
  thread: (id: string) => api.get<AssistantThread>(`/assistant/threads/${id}`),
  renameThread: (id: string, title: string) =>
    api.patch<AssistantThread>(`/assistant/threads/${id}`, { title }),
  deleteThread: (id: string) => api.delete(`/assistant/threads/${id}`),
  restoreThread: (id: string) => api.post<AssistantThread>(`/assistant/threads/${id}/restore`),
  resolveActions: (threadId: string, messageId: string, actionsResult: ActionsResult) =>
    api.patch(`/assistant/threads/${threadId}/messages/${messageId}`, { actionsResult }),
};

export const notificationsApi = {
  list: (limit?: number) => api.get<NotificationList>('/notifications', { limit }),
  markRead: (input: { ids: string[] } | { all: true }) =>
    api.post<{ unreadCount: number }>('/notifications/read', input),
};

export const activityApi = {
  list: (limit?: number) => api.get<ActivityFeedItem[]>('/activity', { limit }),
};

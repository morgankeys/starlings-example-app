// Domain types shared by the API client (src/api) and the mock backend (src/mocks).
// Keep these free of React and browser APIs so a future mobile app can reuse them.

export type ID = string;
/** ISO 8601 timestamp, e.g. 2026-10-14T15:04:05.000Z */
export type Timestamp = string;
/** Calendar date, e.g. 2026-10-14 */
export type DateOnly = string;

export type AccentColor = 'teal' | 'violet' | 'amber' | 'sky' | 'rust';

// ---- Organization, people, teams --------------------------------------------------------

export type OrgRole = 'admin' | 'member' | 'guest';

export interface Organization {
  id: ID;
  name: string;
  domain: string;
  plan: string;
}

export interface User {
  id: ID;
  name: string;
  email: string;
  title: string;
  role: OrgRole;
  color: AccentColor;
  location: string;
  /** Company name for guests from outside the organization. */
  company?: string;
}

export type TeamRole = 'lead' | 'member';

export interface TeamMember {
  userId: ID;
  role: TeamRole;
}

export interface Team {
  id: ID;
  name: string;
  description: string;
  color: AccentColor;
  members: TeamMember[];
}

export interface TeamSummary extends Team {
  openTaskCount: number;
}

export interface Project {
  id: ID;
  name: string;
  description: string;
  teamId: ID;
  color: AccentColor;
  folderId: ID;
}

export interface ProjectSummary extends Project {
  openTaskCount: number;
  doneTaskCount: number;
}

export interface Session {
  user: User;
  org: Organization;
  teams: Team[];
}

// ---- Tasks ------------------------------------------------------------------------------

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done'];
export const TASK_PRIORITIES: TaskPriority[] = ['urgent', 'high', 'medium', 'low'];

export interface Task {
  id: ID;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: ID | null;
  teamId: ID | null;
  projectId: ID | null;
  dueDate: DateOnly | null;
  labels: string[];
  fileIds: ID[];
  createdById: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt: Timestamp | null;
  commentCount: number;
}

export interface Comment {
  id: ID;
  taskId: ID;
  authorId: ID;
  body: string;
  createdAt: Timestamp;
}

export type ActivityKind =
  | 'created'
  | 'title'
  | 'status'
  | 'assignee'
  | 'priority'
  | 'due'
  | 'file_linked'
  | 'file_unlinked';

export interface ActivityEvent {
  id: ID;
  taskId: ID;
  actorId: ID;
  kind: ActivityKind;
  from: string | null;
  to: string | null;
  createdAt: Timestamp;
}

export interface TaskDetail extends Task {
  comments: Comment[];
  activity: ActivityEvent[];
  files: FileItem[];
  canEdit: boolean;
}

export interface TaskFilters {
  assignee?: ID | 'me' | 'unassigned';
  team?: ID;
  project?: ID;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  due?: 'overdue' | 'today' | 'week' | 'none';
  q?: string;
  includeDone?: boolean;
}

export interface NewTask {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: ID | null;
  teamId?: ID | null;
  projectId?: ID | null;
  dueDate?: DateOnly | null;
  labels?: string[];
  fileIds?: ID[];
}

export type TaskPatch = Partial<Omit<NewTask, 'fileIds'>>;

// ---- Files, folders, sharing ------------------------------------------------------------

export type FileKind = 'doc' | 'sheet' | 'slides' | 'pdf' | 'image';
export type GeneralAccess = 'restricted' | 'org_view' | 'org_edit';
export type AccessLevel = 'view' | 'edit';
/** What the current user can do with a resource. */
export type Access = 'view' | 'edit' | 'owner';

export interface ShareGrant {
  principalType: 'user' | 'team';
  principalId: ID;
  level: AccessLevel;
}

interface Shareable {
  id: ID;
  name: string;
  ownerId: ID;
  generalAccess: GeneralAccess;
  grants: ShareGrant[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Computed for the current user. */
  access: Access;
}

export interface Folder extends Shareable {
  parentId: ID | null;
  projectId: ID | null;
  itemCount: number;
}

export interface FileItem extends Shareable {
  kind: FileKind;
  folderId: ID;
  size: number;
  updatedById: ID;
  version: number;
  starred: boolean;
  linkedTaskCount: number;
}

export interface Breadcrumb {
  id: ID;
  name: string;
}

export interface FolderView {
  folder: Folder;
  path: Breadcrumb[];
  folders: Folder[];
  files: FileItem[];
}

export interface AccessEntry {
  principalType: 'user' | 'team' | 'org';
  principalId: ID;
  level: AccessLevel | 'owner';
  inheritedFrom: Breadcrumb | null;
}

export interface FileDetail extends FileItem {
  contentText: string;
  path: Breadcrumb[];
  linkedTasks: Task[];
}

export interface ShareSettings {
  resourceType: 'file' | 'folder';
  resourceId: ID;
  name: string;
  ownerId: ID;
  generalAccess: GeneralAccess;
  grants: ShareGrant[];
  inherited: AccessEntry[];
  canManage: boolean;
}

export type FileView = 'recent' | 'shared' | 'starred';

// ---- Search -----------------------------------------------------------------------------

export type SearchResultType = 'task' | 'file' | 'folder' | 'user' | 'team' | 'project';

export interface SearchResult {
  type: SearchResultType;
  id: ID;
  title: string;
  subtitle: string;
}

// ---- Assistant --------------------------------------------------------------------------

export type AssistantContextType = 'file' | 'task' | 'team' | 'project' | 'person';

export interface AssistantContext {
  type: AssistantContextType;
  id: ID;
  label: string;
}

export interface Citation {
  type: 'task' | 'file' | 'user' | 'team' | 'project';
  id: ID;
  title: string;
}

export interface AssistantRequest {
  message: string;
  context: AssistantContext | null;
}

/** One event in the assistant's text/event-stream response. */
export type AssistantStreamEvent =
  | { type: 'token'; text: string }
  | { type: 'citations'; items: Citation[] }
  | { type: 'done' }
  | { type: 'error'; message: string };

export interface FocusItem {
  task: Task;
  reason: string;
}

export interface FocusSummary {
  headline: string;
  items: FocusItem[];
}

// ---- Errors -----------------------------------------------------------------------------

export interface ApiErrorBody {
  error: { code: string; message: string };
}

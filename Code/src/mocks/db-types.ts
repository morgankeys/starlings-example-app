// Records as the mock backend stores them. Computed, per-user fields (access, starred,
// counts) are added by the handlers when a record is sent to the client.
import type {
  ActivityEvent,
  Comment,
  FileKind,
  GeneralAccess,
  ID,
  Organization,
  Project,
  ShareGrant,
  Task,
  Team,
  Timestamp,
  User,
} from '@/domain/types';

export interface FolderRecord {
  id: ID;
  name: string;
  parentId: ID | null;
  ownerId: ID;
  projectId: ID | null;
  generalAccess: GeneralAccess;
  grants: ShareGrant[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
}

export interface FileRecord {
  id: ID;
  name: string;
  kind: FileKind;
  folderId: ID;
  ownerId: ID;
  size: number;
  generalAccess: GeneralAccess;
  grants: ShareGrant[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedById: ID;
  version: number;
  contentText: string;
  deletedAt: Timestamp | null;
}

export type TaskRecord = Omit<Task, 'commentCount'> & { deletedAt: Timestamp | null };

export interface Database {
  meta: { version: number; seededOn: string; mode: 'seed' | 'empty' };
  sessionUserId: ID | null;
  org: Organization;
  users: User[];
  teams: Team[];
  projects: Project[];
  tasks: TaskRecord[];
  comments: Comment[];
  activity: ActivityEvent[];
  folders: FolderRecord[];
  files: FileRecord[];
  /** userId → starred file ids */
  stars: Record<ID, ID[]>;
  /** userId → fileId → last opened */
  opens: Record<ID, Record<ID, Timestamp>>;
}

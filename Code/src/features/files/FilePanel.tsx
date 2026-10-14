import {
  FolderInput,
  ListPlus,
  MoreHorizontal,
  Pencil,
  Share2,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePanels } from '@/app/panels';
import { useSession } from '@/app/session';
import { useShellActions } from '@/app/shellActions';
import {
  Avatar,
  Badge,
  Button,
  ErrorState,
  IconButton,
  Menu,
  MenuItem,
  MenuSeparator,
  Notice,
  SidePanel,
  Skeleton,
  useToast,
} from '@/components/ui';
import type { FileDetail } from '@/domain/types';
import { useAssistant, useAssistantContext } from '@/features/assistant/AssistantProvider';
import { useUserMap } from '@/features/org/api';
import { ShareDialog, type ShareTarget } from '@/features/sharing/ShareDialog';
import { StatusIcon } from '@/features/tasks/TaskIcons';
import { formatBytes, formatDue, timeAgo } from '@/lib/dates';
import { useFile, useFileMutations } from './api';
import { DocPreview } from './DocPreview';
import { FileIcon, fileKindLabel } from './FileIcon';
import { MoveDialog, RenameDialog } from './FolderDialogs';
import styles from './FilePanel.module.css';

const ACCESS_LABEL = { owner: 'Owner', edit: 'Can edit', view: 'Can view' };
const GENERAL_LABEL = {
  restricted: 'Restricted',
  org_view: 'Company can view',
  org_edit: 'Company can edit',
};

export function FilePanel({ fileId }: { fileId: string }) {
  const { close } = usePanels();
  const { data: file, error, isPending, refetch } = useFile(fileId);
  useAssistantContext(file ? { type: 'file', id: file.id, label: file.name } : null, 'panel');
  const assistant = useAssistant();
  const { updateFile, deleteFile, restoreFile } = useFileMutations();
  const { newTask } = useShellActions();
  const { user } = useSession();
  const toast = useToast();
  const [share, setShare] = useState<ShareTarget | null>(null);
  const [rename, setRename] = useState<{ type: 'file'; id: string; name: string } | null>(null);
  const [move, setMove] = useState<{
    type: 'file';
    id: string;
    name: string;
    parentId: string;
  } | null>(null);

  const canEdit = file?.access === 'edit' || file?.access === 'owner';
  const folder = file?.path[file.path.length - 1];

  const onDelete = () => {
    if (!file) return;
    deleteFile.mutate(file.id, {
      onSuccess: () => {
        close();
        toast({
          title: `Deleted “${file.name}”`,
          action: { label: 'Undo', onClick: () => restoreFile.mutate(file.id) },
        });
      },
      onError: (err) =>
        toast({ title: "Couldn't delete the file", description: err.message, tone: 'danger' }),
    });
  };

  return (
    <SidePanel
      label="File details"
      onClose={close}
      title={
        folder ? (
          <Link
            to={folder.id === 'fd_root' ? '/files' : `/files/folders/${folder.id}`}
            className={styles.crumb}
          >
            {folder.name}
          </Link>
        ) : (
          'File'
        )
      }
      actions={
        file && (
          <>
            <IconButton
              label={file.starred ? 'Remove from starred' : 'Star'}
              icon={<Star className={file.starred ? styles.starred : undefined} />}
              onClick={() => updateFile.mutate({ id: file.id, starred: !file.starred })}
            />
            <IconButton
              label="Share"
              icon={<Share2 />}
              onClick={() => setShare({ type: 'file', id: file.id, name: file.name })}
            />
            <Menu
              align="end"
              trigger={<IconButton label="More actions" icon={<MoreHorizontal />} noTooltip />}
            >
              <MenuItem
                icon={<Pencil />}
                disabled={!canEdit}
                onSelect={() => setRename({ type: 'file', id: file.id, name: file.name })}
              >
                Rename
              </MenuItem>
              <MenuItem
                icon={<FolderInput />}
                disabled={!canEdit}
                onSelect={() =>
                  setMove({ type: 'file', id: file.id, name: file.name, parentId: file.folderId })
                }
              >
                Move
              </MenuItem>
              {user.role !== 'guest' && (
                <MenuItem
                  icon={<ListPlus />}
                  onSelect={() =>
                    newTask({ title: `Follow up on ${file.name}`, fileIds: [file.id] })
                  }
                >
                  Create task from file
                </MenuItem>
              )}
              <MenuSeparator />
              <MenuItem icon={<Trash2 />} danger disabled={!canEdit} onSelect={onDelete}>
                Delete
              </MenuItem>
            </Menu>
          </>
        )
      }
    >
      {isPending && (
        <div className={styles.pad}>
          <Skeleton lines={10} />
        </div>
      )}
      {error && (
        <div className={styles.pad}>
          <ErrorState error={error} onRetry={refetch} />
        </div>
      )}
      {file && (
        <FileBody
          file={file}
          onAsk={(q) => assistant.askAbout({ type: 'file', id: file.id, label: file.name }, q)}
          onShare={() => setShare({ type: 'file', id: file.id, name: file.name })}
        />
      )}
      <ShareDialog target={share} onClose={() => setShare(null)} />
      <RenameDialog item={rename} onClose={() => setRename(null)} />
      <MoveDialog item={move} onClose={() => setMove(null)} />
    </SidePanel>
  );
}

function FileBody({
  file,
  onAsk,
  onShare,
}: {
  file: FileDetail;
  onAsk: (q: string) => void;
  onShare: () => void;
}) {
  const users = useUserMap();
  const { openTask } = usePanels();
  const owner = users.get(file.ownerId);
  const editor = users.get(file.updatedById);
  const readable = !!file.contentText;
  const readOnly = file.access === 'view';

  return (
    <div className={styles.body}>
      <header className={styles.header}>
        <FileIcon kind={file.kind} size="lg" />
        <div className={styles.headerText}>
          <h2 className={styles.name}>{file.name}</h2>
          <p className={styles.meta}>
            {fileKindLabel(file.kind)} · {formatBytes(file.size)} · Edited {timeAgo(file.updatedAt)}{' '}
            by {editor?.name ?? 'someone'}
          </p>
        </div>
      </header>

      {readOnly && (
        <Notice>You can view this file. Ask {owner?.name ?? 'the owner'} for edit access.</Notice>
      )}

      <div className={styles.ask}>
        <Sparkles className={styles.askIcon} aria-hidden />
        <span className={styles.askText}>
          {readable ? 'Ask Birdy about this file' : 'Ask Birdy what it knows about this file'}
        </span>
        <div className={styles.askActions}>
          <Button size="sm" variant="ai" onClick={() => onAsk('Summarize this file')}>
            Summarize
          </Button>
          {readable && (
            <Button
              size="sm"
              variant="ai"
              onClick={() => onAsk('What decisions and action items does it record?')}
            >
              Decisions
            </Button>
          )}
        </div>
      </div>

      <section className={styles.section} aria-label="Preview">
        {readable ? (
          <DocPreview text={file.contentText} />
        ) : (
          <div className={styles.noPreview}>
            <FileIcon kind={file.kind} size="lg" />
            <p>
              {file.kind === 'image'
                ? 'Image previews aren’t available in this prototype.'
                : 'No preview for this file yet.'}
            </p>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Linked tasks</h3>
        {file.linkedTasks.length === 0 ? (
          <p className={styles.muted}>Not linked to any tasks.</p>
        ) : (
          <ul className={styles.tasks}>
            {file.linkedTasks.map((t) => (
              <li key={t.id}>
                <button type="button" className={styles.task} onClick={() => openTask(t.id)}>
                  <StatusIcon status={t.status} />
                  <span className={styles.taskTitle}>{t.title}</span>
                  <span className={styles.muted}>{formatDue(t.dueDate)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Access</h3>
          <Button size="sm" variant="ghost" icon={<Share2 />} onClick={onShare}>
            {readOnly ? 'See who has access' : 'Manage access'}
          </Button>
        </div>
        <dl className={styles.details}>
          <dt>You</dt>
          <dd>
            <Badge tone={file.access === 'view' ? 'neutral' : 'success'}>
              {ACCESS_LABEL[file.access]}
            </Badge>
          </dd>
          <dt>General</dt>
          <dd>{GENERAL_LABEL[file.generalAccess]}</dd>
          <dt>Owner</dt>
          <dd className={styles.person}>
            {owner && <Avatar user={owner} size="xs" />}
            {owner?.name}
          </dd>
          <dt>Location</dt>
          <dd>
            {file.path.map((p, i) => (
              <span key={p.id}>
                {i > 0 && ' / '}
                <Link
                  to={p.id === 'fd_root' ? '/files' : `/files/folders/${p.id}`}
                  className={styles.link}
                >
                  {p.name}
                </Link>
              </span>
            ))}
          </dd>
          <dt>Version</dt>
          <dd>v{file.version}</dd>
          <dt>Created</dt>
          <dd>{timeAgo(file.createdAt)}</dd>
        </dl>
      </section>
    </div>
  );
}

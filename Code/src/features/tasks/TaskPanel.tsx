import {
  CalendarDays,
  Link2,
  MoreHorizontal,
  Paperclip,
  Plus,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { usePanels } from '@/app/panels';
import { useSession } from '@/app/session';
import {
  Avatar,
  Badge,
  Button,
  DatePicker,
  Dot,
  ErrorState,
  IconButton,
  Menu,
  MenuItem,
  Notice,
  SidePanel,
  Skeleton,
  Textarea,
  useToast,
} from '@/components/ui';
import type { ActivityEvent, Comment, TaskDetail, TaskPatch, User } from '@/domain/types';
import { useAssistant, useAssistantContext } from '@/features/assistant/AssistantProvider';
import { FileIcon } from '@/features/files/FileIcon';
import { FilePickerDialog } from '@/features/files/FilePickerDialog';
import { useProjects, useTeams, useUserMap } from '@/features/org/api';
import { dueState, formatDue, formatLongDue, timeAgo } from '@/lib/dates';
import { splitMentions } from '@/lib/mentions';
import {
  useDeleteTask,
  useRestoreTask,
  useTask,
  useTaskComment,
  useTaskFiles,
  useUpdateTask,
} from './api';
import { PRIORITY_LABEL, STATUS_LABEL } from './meta';
import { AssigneeMenu, PriorityMenu, ProjectMenu, StatusMenu, TeamMenu } from './pickers';
import { PriorityIcon, StatusIcon } from './TaskIcons';
import styles from './TaskPanel.module.css';

export function TaskPanel({ taskId }: { taskId: string }) {
  const { close } = usePanels();
  const { data: task, error, isPending, refetch } = useTask(taskId);
  const { data: projects } = useProjects();
  const assistant = useAssistant();
  const toast = useToast();
  const remove = useDeleteTask();
  const restore = useRestoreTask();
  useAssistantContext(task ? { type: 'task', id: task.id, label: task.title } : null, 'panel');

  const project = projects?.find((p) => p.id === task?.projectId);

  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    toast({ title: 'Link copied' });
  };

  const onDelete = () => {
    if (!task) return;
    remove.mutate(task.id, {
      onSuccess: () => {
        close();
        toast({
          title: 'Task deleted',
          description: task.title,
          action: { label: 'Undo', onClick: () => restore.mutate(task.id) },
        });
      },
      onError: (err) =>
        toast({ title: "Couldn't delete the task", description: err.message, tone: 'danger' }),
    });
  };

  return (
    <SidePanel
      label="Task details"
      onClose={close}
      title={
        project ? (
          <Link to={`/projects/${project.id}`} className={styles.crumb}>
            <Dot color={project.color} />
            {project.name}
          </Link>
        ) : (
          'Task'
        )
      }
      actions={
        task && (
          <>
            <IconButton
              label="Ask Birdy about this task"
              icon={<Sparkles />}
              onClick={() => assistant.askAbout({ type: 'task', id: task.id, label: task.title })}
            />
            <IconButton label="Copy link" icon={<Link2 />} onClick={copyLink} />
            <Menu
              align="end"
              trigger={<IconButton label="More actions" icon={<MoreHorizontal />} noTooltip />}
            >
              <MenuItem icon={<Trash2 />} danger disabled={!task.canEdit} onSelect={onDelete}>
                Delete task
              </MenuItem>
            </Menu>
          </>
        )
      }
      footer={task && <CommentComposer taskId={task.id} />}
    >
      {isPending && (
        <div className={styles.pad}>
          <Skeleton lines={8} />
        </div>
      )}
      {error && (
        <div className={styles.pad}>
          <ErrorState error={error} onRetry={refetch} />
        </div>
      )}
      {task && <TaskBody task={task} />}
    </SidePanel>
  );
}

function TaskBody({ task }: { task: TaskDetail }) {
  const update = useUpdateTask();
  const toast = useToast();
  const users = useUserMap();
  const { data: teams } = useTeams();
  const { data: projects } = useProjects();
  const { openFile } = usePanels();
  const files = useTaskFiles(task.id);
  const [pickerOpen, setPickerOpen] = useState(false);
  const readOnly = !task.canEdit;

  const save = (patch: TaskPatch) =>
    update.mutate(
      { id: task.id, patch },
      {
        onError: (err) =>
          toast({ title: "Couldn't save", description: err.message, tone: 'danger' }),
      },
    );

  const assignee = task.assigneeId ? users.get(task.assigneeId) : undefined;
  const team = teams?.find((t) => t.id === task.teamId);
  const project = projects?.find((p) => p.id === task.projectId);
  const due = dueState(task.dueDate, task.status === 'done');

  return (
    <div className={styles.body}>
      {readOnly && (
        <Notice>
          You can view this task. Only the assignee and workspace members can change it.
        </Notice>
      )}

      <EditableTitle value={task.title} disabled={readOnly} onSave={(title) => save({ title })} />

      <dl className={styles.props}>
        <Prop label="Status">
          <StatusMenu
            value={task.status}
            onChange={(status) => save({ status })}
            trigger={
              <button type="button" className={styles.propButton} disabled={readOnly}>
                <StatusIcon status={task.status} title={false} />
                {STATUS_LABEL[task.status]}
              </button>
            }
          />
        </Prop>
        <Prop label="Assignee">
          <AssigneeMenu
            value={task.assigneeId}
            teamId={task.teamId}
            onChange={(assigneeId) => save({ assigneeId })}
            trigger={
              <button type="button" className={styles.propButton} disabled={readOnly}>
                {assignee ? <Avatar user={assignee} size="xs" /> : <Users />}
                {assignee?.name ?? 'Unassigned'}
              </button>
            }
          />
        </Prop>
        <Prop label="Due">
          <DatePicker
            value={task.dueDate}
            onChange={(dueDate) => save({ dueDate })}
            trigger={
              <button
                type="button"
                className={styles.propButton}
                disabled={readOnly}
                data-due={due}
                title={formatLongDue(task.dueDate)}
              >
                <CalendarDays />
                {formatDue(task.dueDate)}
              </button>
            }
          />
        </Prop>
        <Prop label="Priority">
          <PriorityMenu
            value={task.priority}
            onChange={(priority) => save({ priority })}
            trigger={
              <button type="button" className={styles.propButton} disabled={readOnly}>
                <PriorityIcon priority={task.priority} />
                {PRIORITY_LABEL[task.priority]}
              </button>
            }
          />
        </Prop>
        <Prop label="Team">
          <TeamMenu
            value={task.teamId}
            onChange={(teamId) => save({ teamId })}
            trigger={
              <button type="button" className={styles.propButton} disabled={readOnly}>
                {team ? <Dot color={team.color} /> : null}
                {team?.name ?? 'No team'}
              </button>
            }
          />
        </Prop>
        <Prop label="Project">
          <ProjectMenu
            value={task.projectId}
            onChange={(projectId) => save({ projectId })}
            trigger={
              <button type="button" className={styles.propButton} disabled={readOnly}>
                {project ? <Dot color={project.color} /> : null}
                {project?.name ?? 'No project'}
              </button>
            }
          />
        </Prop>
        {task.labels.length > 0 && (
          <Prop label="Labels">
            <span className={styles.labels}>
              {task.labels.map((l) => (
                <Badge key={l} tone={l === 'blocked' ? 'danger' : 'neutral'}>
                  {l}
                </Badge>
              ))}
            </span>
          </Prop>
        )}
      </dl>

      <EditableDescription
        value={task.description}
        disabled={readOnly}
        onSave={(description) => save({ description })}
      />

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <Paperclip aria-hidden /> Files
          </h3>
          {!readOnly && (
            <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => setPickerOpen(true)}>
              Link a file
            </Button>
          )}
        </header>
        {task.files.length === 0 ? (
          <p className={styles.muted}>No files linked yet.</p>
        ) : (
          <ul className={styles.files}>
            {task.files.map((f) => (
              <li key={f.id} className={styles.file}>
                <button type="button" className={styles.fileButton} onClick={() => openFile(f.id)}>
                  <FileIcon kind={f.kind} />
                  <span className={styles.fileName}>{f.name}</span>
                </button>
                {!readOnly && (
                  <IconButton
                    label={`Unlink ${f.name}`}
                    icon={<X />}
                    size="sm"
                    onClick={() => files.unlink.mutate(f.id)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Timeline comments={task.comments} activity={task.activity} users={users} />

      <FilePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        exclude={task.fileIds}
        onPick={(fileId) =>
          files.link.mutate(fileId, {
            onError: (err) =>
              toast({ title: "Couldn't link the file", description: err.message, tone: 'danger' }),
          })
        }
      />
    </div>
  );
}

function Prop({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className={styles.propLabel}>{label}</dt>
      <dd className={styles.propValue}>{children}</dd>
    </>
  );
}

function EditableTitle({
  value,
  disabled,
  onSave,
}: {
  value: string;
  disabled: boolean;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const commit = () => {
    const v = draft.trim();
    if (v && v !== value) onSave(v);
    else setDraft(value);
  };
  return (
    <textarea
      className={styles.title}
      aria-label="Task title"
      value={draft}
      rows={1}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setDraft(value);
        }
      }}
    />
  );
}

function EditableDescription({
  value,
  disabled,
  onSave,
}: {
  value: string;
  disabled: boolean;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <Textarea
      className={styles.description}
      aria-label="Description"
      placeholder={disabled ? 'No description' : 'Add a description…'}
      value={draft}
      rows={3}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onSave(draft)}
    />
  );
}

type TimelineItem =
  | { kind: 'comment'; at: string; comment: Comment }
  | { kind: 'event'; at: string; event: ActivityEvent };

function describe(e: ActivityEvent, users: Map<string, User>): string {
  const name = (id: string | null) => (id ? (users.get(id)?.name ?? 'someone') : 'nobody');
  switch (e.kind) {
    case 'created':
      return 'created this task';
    case 'status':
      return `changed status to ${STATUS_LABEL[e.to as keyof typeof STATUS_LABEL] ?? e.to}`;
    case 'assignee':
      return e.to ? `assigned it to ${name(e.to)}` : 'unassigned it';
    case 'priority':
      return `set priority to ${PRIORITY_LABEL[e.to as keyof typeof PRIORITY_LABEL] ?? e.to}`;
    case 'due':
      return e.to ? `set the due date to ${formatDue(e.to)}` : 'removed the due date';
    case 'title':
      return 'renamed the task';
    case 'file_linked':
      return `linked ${e.to}`;
    case 'file_unlinked':
      return `unlinked ${e.from}`;
  }
}

function Timeline({
  comments,
  activity,
  users,
}: {
  comments: Comment[];
  activity: ActivityEvent[];
  users: Map<string, User>;
}) {
  const people = useMemo(() => [...users.values()], [users]);
  const items: TimelineItem[] = [
    ...comments.map((c) => ({ kind: 'comment' as const, at: c.createdAt, comment: c })),
    ...activity.map((e) => ({ kind: 'event' as const, at: e.createdAt, event: e })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Activity</h3>
      <ol className={styles.timeline}>
        {items.map((item) => {
          if (item.kind === 'event') {
            const actor = users.get(item.event.actorId);
            return (
              <li key={item.event.id} className={styles.event}>
                <span className={styles.eventDot} aria-hidden />
                <span>
                  <strong className={styles.actor}>{actor?.name ?? 'Someone'}</strong>{' '}
                  {describe(item.event, users)}
                  <span className={styles.when}> · {timeAgo(item.at)}</span>
                </span>
              </li>
            );
          }
          const author = users.get(item.comment.authorId);
          return (
            <li key={item.comment.id} className={styles.comment}>
              {author && <Avatar user={author} size="sm" />}
              <div className={styles.commentBody}>
                <p>
                  <strong className={styles.actor}>{author?.name ?? 'Someone'}</strong>
                  <span className={styles.when}> · {timeAgo(item.at)}</span>
                </p>
                <p className={styles.commentText}>
                  <CommentText body={item.comment.body} users={people} />
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** A comment's text, with `@Name` mentions that resolve to a person highlighted. */
function CommentText({ body, users }: { body: string; users: User[] }) {
  return (
    <>
      {splitMentions(body, users).map((part, i) =>
        part.user ? (
          <span key={i} data-component="Mention" className={styles.mention} title={part.user.name}>
            {part.text}
          </span>
        ) : (
          part.text
        ),
      )}
    </>
  );
}

function CommentComposer({ taskId }: { taskId: string }) {
  const { user } = useSession();
  const comment = useTaskComment(taskId);
  const toast = useToast();
  const [body, setBody] = useState('');
  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!body.trim()) return;
    comment.mutate(body, {
      onSuccess: () => setBody(''),
      onError: (err) =>
        toast({ title: "Couldn't post the comment", description: err.message, tone: 'danger' }),
    });
  };
  return (
    <form className={styles.composer} onSubmit={submit}>
      <Avatar user={user} size="sm" />
      <Textarea
        rows={1}
        className={styles.composerInput}
        placeholder="Write a comment… Type @ to mention someone"
        aria-label="Write a comment"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
        }}
      />
      <Button
        type="submit"
        size="sm"
        variant="primary"
        disabled={!body.trim()}
        loading={comment.isPending}
      >
        Comment
      </Button>
    </form>
  );
}

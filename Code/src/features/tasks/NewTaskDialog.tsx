import { useState, type FormEvent } from 'react';
import { usePanels } from '@/app/panels';
import { useSession } from '@/app/session';
import { Button, Dialog, Field, Input, Select, Textarea, useToast } from '@/components/ui';
import { TASK_PRIORITIES, TASK_STATUSES, type NewTask } from '@/domain/types';
import { useProjects, useTeams, useUsers } from '@/features/org/api';
import { useCreateTask } from './api';
import { PRIORITY_LABEL, STATUS_LABEL } from './meta';
import styles from './NewTaskDialog.module.css';

/** Full "New task" form. Open it by passing `defaults` (an object, possibly empty). */
export function NewTaskDialog({
  defaults,
  onClose,
}: {
  defaults: Partial<NewTask> | null;
  onClose: () => void;
}) {
  const create = useCreateTask();
  const toast = useToast();
  const { openTask } = usePanels();

  const submit = (form: NewTask) =>
    create.mutate(form, {
      onSuccess: (task) => {
        onClose();
        toast({
          title: 'Task created',
          description: task.title,
          tone: 'success',
          action: { label: 'Open', onClick: () => openTask(task.id) },
        });
      },
      onError: (err) =>
        toast({ title: "Couldn't create the task", description: err.message, tone: 'danger' }),
    });

  return (
    <Dialog
      open={defaults !== null}
      onOpenChange={(o) => !o && onClose()}
      title="New task"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="new-task-form" loading={create.isPending}>
            Create task
          </Button>
        </>
      }
    >
      {/* The dialog unmounts its content when closed, so the form starts fresh on every open. */}
      {defaults && <NewTaskForm defaults={defaults} onSubmit={submit} />}
    </Dialog>
  );
}

function NewTaskForm({
  defaults,
  onSubmit,
}: {
  defaults: Partial<NewTask>;
  onSubmit: (form: NewTask) => void;
}) {
  const { user, teams: myTeams } = useSession();
  const { data: users = [] } = useUsers();
  const { data: teams = [] } = useTeams();
  const { data: projects = [] } = useProjects();
  const [form, setForm] = useState<NewTask>(() => ({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assigneeId: user.id,
    teamId: myTeams[0]?.id ?? null,
    projectId: null,
    dueDate: null,
    ...defaults,
  }));
  const [error, setError] = useState<string>();

  const set = <K extends keyof NewTask>(key: K, value: NewTask[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Give the task a title');
      return;
    }
    onSubmit(form);
  };

  return (
    <form id="new-task-form" className={styles.form} onSubmit={submit} noValidate>
      <Field label="Title" error={error}>
        {(p) => (
          <Input
            {...p}
            autoFocus
            value={form.title}
            onChange={(e) => {
              set('title', e.target.value);
              setError(undefined);
            }}
            placeholder="What needs to happen?"
          />
        )}
      </Field>
      <Field label="Description" optional>
        {(p) => (
          <Textarea
            {...p}
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Add context, links or acceptance criteria"
          />
        )}
      </Field>
      <div className={styles.grid}>
        <Field label="Assignee">
          {(p) => (
            <Select
              {...p}
              value={form.assigneeId ?? ''}
              onChange={(e) => set('assigneeId', e.target.value || null)}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.id === user.id ? `${u.name} (you)` : u.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Due date" optional>
          {(p) => (
            <Input
              {...p}
              type="date"
              value={form.dueDate ?? ''}
              onChange={(e) => set('dueDate', e.target.value || null)}
            />
          )}
        </Field>
        <Field label="Priority">
          {(p) => (
            <Select
              {...p}
              value={form.priority}
              onChange={(e) => set('priority', e.target.value as NewTask['priority'])}
            >
              {TASK_PRIORITIES.map((v) => (
                <option key={v} value={v}>
                  {PRIORITY_LABEL[v]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Status">
          {(p) => (
            <Select
              {...p}
              value={form.status}
              onChange={(e) => set('status', e.target.value as NewTask['status'])}
            >
              {TASK_STATUSES.map((v) => (
                <option key={v} value={v}>
                  {STATUS_LABEL[v]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Team">
          {(p) => (
            <Select
              {...p}
              value={form.teamId ?? ''}
              onChange={(e) => set('teamId', e.target.value || null)}
            >
              <option value="">No team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Project">
          {(p) => (
            <Select
              {...p}
              value={form.projectId ?? ''}
              onChange={(e) => set('projectId', e.target.value || null)}
            >
              <option value="">No project</option>
              {projects.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
    </form>
  );
}

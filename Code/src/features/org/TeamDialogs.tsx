import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog, Field, Input, Select, Textarea, useToast } from '@/components/ui';
import type { AccentColor, Team } from '@/domain/types';
import { useActiveUsers, useCreateTeam, useTeamMembership } from './api';
import styles from './TeamDialogs.module.css';

const COLORS: AccentColor[] = ['violet', 'sky', 'amber', 'teal', 'rust'];

export function NewTeamDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateTeam();
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<AccentColor>('sky');
  const [error, setError] = useState<string>();
  const close = () => {
    setName('');
    setDescription('');
    setError(undefined);
    onClose();
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Give the team a name');
    create.mutate(
      { name, description, color },
      {
        onSuccess: (team) => {
          close();
          toast({
            title: `Created ${team.name}`,
            description: 'You’re its lead. Add members from the team page.',
            tone: 'success',
          });
          navigate(`/teams/${team.id}`);
        },
        onError: (err) => setError(err.message),
      },
    );
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && close()}
      title="New team"
      description="Teams group people so you can share folders and assign work together."
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="new-team-form" loading={create.isPending}>
            Create team
          </Button>
        </>
      }
    >
      <form id="new-team-form" className={styles.form} onSubmit={submit} noValidate>
        <Field label="Name" error={error}>
          {(p) => (
            <Input
              {...p}
              autoFocus
              value={name}
              onChange={(e) => (setName(e.target.value), setError(undefined))}
              placeholder="e.g. Customer Support"
            />
          )}
        </Field>
        <Field label="Description" optional>
          {(p) => (
            <Textarea
              {...p}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          )}
        </Field>
        <Field label="Color">
          {(p) => (
            <Select {...p} value={color} onChange={(e) => setColor(e.target.value as AccentColor)}>
              {COLORS.map((c) => (
                <option key={c} value={c}>
                  {c[0].toUpperCase() + c.slice(1)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </form>
    </Dialog>
  );
}

export function AddMemberDialog({
  team,
  open,
  onClose,
}: {
  team: Team;
  open: boolean;
  onClose: () => void;
}) {
  const { data: users } = useActiveUsers();
  const { add } = useTeamMembership(team.id);
  const toast = useToast();
  const [userId, setUserId] = useState('');
  const candidates = users.filter(
    (u) => u.role !== 'guest' && !team.members.some((m) => m.userId === u.id),
  );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    add.mutate(userId, {
      onSuccess: () => {
        toast({
          title: `Added ${users.find((u) => u.id === userId)?.name} to ${team.name}`,
          tone: 'success',
        });
        setUserId('');
        onClose();
      },
      onError: (err) =>
        toast({ title: "Couldn't add them", description: err.message, tone: 'danger' }),
    });
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={`Add to ${team.name}`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="add-member-form"
            disabled={!userId}
            loading={add.isPending}
          >
            Add member
          </Button>
        </>
      }
    >
      <form id="add-member-form" onSubmit={submit}>
        <Field label="Person" hint="Guests can’t join teams. Share folders with them instead.">
          {(p) => (
            <Select {...p} value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Choose someone…</option>
              {candidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.title}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </form>
    </Dialog>
  );
}

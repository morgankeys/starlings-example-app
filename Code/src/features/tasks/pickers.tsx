import { UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar, Dot, Menu, MenuLabel, MenuOption, MenuSeparator } from '@/components/ui';
import { TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus } from '@/domain/types';
import { useProjects, useTeams, useUsers } from '@/features/org/api';
import { PRIORITY_LABEL, STATUS_LABEL } from './meta';
import { PriorityIcon, StatusIcon } from './TaskIcons';

export function StatusMenu({
  value,
  onChange,
  trigger,
}: {
  value: TaskStatus | null;
  onChange: (s: TaskStatus) => void;
  trigger: ReactNode;
}) {
  return (
    <Menu trigger={trigger} label="Status">
      {TASK_STATUSES.map((s) => (
        <MenuOption
          key={s}
          icon={<StatusIcon status={s} title={false} />}
          checked={s === value}
          onSelect={() => onChange(s)}
        >
          {STATUS_LABEL[s]}
        </MenuOption>
      ))}
    </Menu>
  );
}

export function PriorityMenu({
  value,
  onChange,
  trigger,
}: {
  value: TaskPriority | null;
  onChange: (p: TaskPriority) => void;
  trigger: ReactNode;
}) {
  return (
    <Menu trigger={trigger} label="Priority">
      {TASK_PRIORITIES.map((p) => (
        <MenuOption
          key={p}
          icon={<PriorityIcon priority={p} />}
          checked={p === value}
          onSelect={() => onChange(p)}
        >
          {PRIORITY_LABEL[p]}
        </MenuOption>
      ))}
    </Menu>
  );
}

/** Pick an assignee. Members of `teamId` are listed first. */
export function AssigneeMenu({
  value,
  onChange,
  trigger,
  teamId,
}: {
  /** `undefined` means the value is mixed or unknown, so nothing is checked. */
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  trigger: ReactNode;
  teamId?: string | null;
}) {
  const { data: users = [] } = useUsers();
  const { data: teams = [] } = useTeams();
  const team = teams.find((t) => t.id === teamId);
  const inTeam = new Set(team?.members.map((m) => m.userId));
  const first = users.filter((u) => inTeam.has(u.id));
  const rest = users.filter((u) => !inTeam.has(u.id));
  return (
    <Menu trigger={trigger} label="Assignee">
      <MenuOption icon={<UserRound />} checked={value === null} onSelect={() => onChange(null)}>
        Unassigned
      </MenuOption>
      {first.length > 0 && <MenuSeparator />}
      {first.length > 0 && <MenuLabel>{team?.name}</MenuLabel>}
      {first.map((u) => (
        <MenuOption
          key={u.id}
          icon={<Avatar user={u} size="xs" />}
          checked={u.id === value}
          onSelect={() => onChange(u.id)}
        >
          {u.name}
        </MenuOption>
      ))}
      <MenuSeparator />
      {first.length > 0 && <MenuLabel>Everyone else</MenuLabel>}
      {rest.map((u) => (
        <MenuOption
          key={u.id}
          icon={<Avatar user={u} size="xs" />}
          checked={u.id === value}
          onSelect={() => onChange(u.id)}
        >
          {u.name}
        </MenuOption>
      ))}
    </Menu>
  );
}

export function TeamMenu({
  value,
  onChange,
  trigger,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  trigger: ReactNode;
}) {
  const { data: teams = [] } = useTeams();
  return (
    <Menu trigger={trigger} label="Team">
      <MenuOption checked={value === null} onSelect={() => onChange(null)}>
        No team
      </MenuOption>
      {teams.map((t) => (
        <MenuOption
          key={t.id}
          icon={<Dot color={t.color} />}
          checked={t.id === value}
          onSelect={() => onChange(t.id)}
        >
          {t.name}
        </MenuOption>
      ))}
    </Menu>
  );
}

export function ProjectMenu({
  value,
  onChange,
  trigger,
}: {
  /** `undefined` means the value is mixed or unknown, so nothing is checked. */
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  trigger: ReactNode;
}) {
  const { data: projects = [] } = useProjects();
  return (
    <Menu trigger={trigger} label="Project">
      <MenuOption checked={value === null} onSelect={() => onChange(null)}>
        No project
      </MenuOption>
      {projects.map((p) => (
        <MenuOption
          key={p.id}
          icon={<Dot color={p.color} />}
          checked={p.id === value}
          onSelect={() => onChange(p.id)}
        >
          {p.name}
        </MenuOption>
      ))}
    </Menu>
  );
}

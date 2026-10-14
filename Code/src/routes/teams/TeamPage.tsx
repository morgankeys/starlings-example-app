import { Crown, MoreHorizontal, Sparkles, UserMinus, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSession } from '@/app/session';
import {
  Avatar,
  Badge,
  Button,
  Dot,
  ErrorState,
  IconButton,
  Menu,
  MenuItem,
  PageHeader,
  Skeleton,
  Tabs,
  useToast,
} from '@/components/ui';
import { useAssistant, useAssistantContext } from '@/features/assistant/AssistantProvider';
import { useFolderTree } from '@/features/files/api';
import { FileIcon } from '@/features/files/FileIcon';
import { useTeam, useTeamMembership, useUserMap } from '@/features/org/api';
import { AddMemberDialog } from '@/features/org/TeamDialogs';
import { TasksView } from '@/features/tasks/TasksView';
import styles from './TeamPage.module.css';

type Tab = 'tasks' | 'members' | 'folders';

export function TeamPage() {
  const { teamId = '' } = useParams();
  const { user } = useSession();
  const { data: team, error, isPending, refetch } = useTeam(teamId);
  const users = useUserMap();
  const assistant = useAssistant();
  const toast = useToast();
  const { remove, setRole } = useTeamMembership(teamId);
  const { data: folders = [] } = useFolderTree();
  const [tab, setTab] = useState<Tab>('tasks');
  const [adding, setAdding] = useState(false);
  useAssistantContext(team ? { type: 'team', id: team.id, label: team.name } : null);

  if (isPending) return <Skeleton lines={6} size="lg" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const teamFolders = folders.filter((f) =>
    f.grants.some((g) => g.principalType === 'team' && g.principalId === team.id),
  );
  const onError = (err: Error) =>
    toast({ title: "Couldn't update the team", description: err.message, tone: 'danger' });

  return (
    <>
      <PageHeader
        eyebrow={
          <span className={styles.eyebrow}>
            <Dot color={team.color} /> Team
          </span>
        }
        title={team.name}
        description={team.description}
        actions={
          <>
            <Button
              variant="ai"
              icon={<Sparkles />}
              onClick={() =>
                assistant.askAbout(
                  { type: 'team', id: team.id, label: team.name },
                  'Who’s overloaded this week?',
                )
              }
            >
              Check workload
            </Button>
            {team.canManage && (
              <Button icon={<UserPlus />} onClick={() => setAdding(true)}>
                Add member
              </Button>
            )}
          </>
        }
      />
      <Tabs
        label="Team sections"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'tasks', label: 'Tasks', count: team.openTaskCount },
          { value: 'members', label: 'Members', count: team.members.length },
          { value: 'folders', label: 'Shared folders', count: teamFolders.length },
        ]}
      >
        {tab === 'tasks' && (
          <TasksView
            base={{ team: team.id }}
            quickAddDefaults={{ teamId: team.id }}
            canAdd={user.role !== 'guest'}
            emptyTitle={`${team.name} has no tasks yet`}
          />
        )}
        {tab === 'members' && (
          <ul className={styles.members}>
            {team.members.map((m) => {
              const u = users.get(m.userId);
              if (!u) return null;
              return (
                <li key={m.userId} className={styles.member}>
                  <Avatar user={u} size="md" />
                  <Link to={`/people/${u.id}`} className={styles.memberText}>
                    <span className={styles.memberName}>
                      {u.name}
                      {m.role === 'lead' && <Badge tone="neutral">Lead</Badge>}
                    </span>
                    <span className={styles.muted}>{u.title}</span>
                  </Link>
                  {team.canManage && (
                    <Menu
                      align="end"
                      trigger={
                        <IconButton
                          label={`Manage ${u.name}`}
                          icon={<MoreHorizontal />}
                          noTooltip
                        />
                      }
                    >
                      <MenuItem
                        icon={<Crown />}
                        onSelect={() =>
                          setRole.mutate(
                            { userId: u.id, role: m.role === 'lead' ? 'member' : 'lead' },
                            { onError },
                          )
                        }
                      >
                        {m.role === 'lead' ? 'Make member' : 'Make lead'}
                      </MenuItem>
                      <MenuItem
                        icon={<UserMinus />}
                        danger
                        onSelect={() => remove.mutate(u.id, { onError })}
                      >
                        Remove from team
                      </MenuItem>
                    </Menu>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {tab === 'folders' && (
          <ul className={styles.folders}>
            {teamFolders.length === 0 && (
              <p className={styles.muted}>No folders are shared with {team.name} yet.</p>
            )}
            {teamFolders.map((f) => (
              <li key={f.id}>
                <Link to={`/files/folders/${f.id}`} className={styles.folder}>
                  <FileIcon kind="folder" />
                  <span className={styles.memberName}>{f.name}</span>
                  <span className={styles.muted}>{f.itemCount} items</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Tabs>
      <AddMemberDialog team={team} open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

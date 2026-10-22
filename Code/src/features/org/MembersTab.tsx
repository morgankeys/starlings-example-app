import { UserPlus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Dialog,
  ErrorState,
  Notice,
  Select,
  Skeleton,
  Tooltip,
  useToast,
} from '@/components/ui';
import type { Organization, OrgRole, User, UserStatus } from '@/domain/types';
import { useTeams, useUpdateMember, useUsers } from './api';
import { InviteMemberDialog } from './InviteMemberDialog';
import styles from './MembersTab.module.css';

const ROLE_LABEL: Record<OrgRole, string> = {
  admin: 'Workspace admin',
  member: 'Member',
  guest: 'Guest',
};

const STATUS: Record<UserStatus, { label: string; tone: 'success' | 'neutral' | 'danger' }> = {
  active: { label: 'Active', tone: 'success' },
  invited: { label: 'Invited', tone: 'neutral' },
  deactivated: { label: 'Deactivated', tone: 'danger' },
};

/** Wraps a control so a disabled state can explain itself on hover and focus. */
function WithReason({ reason, children }: { reason?: string; children: ReactNode }) {
  if (!reason) return <>{children}</>;
  return (
    <Tooltip content={reason}>
      <span className={styles.reason} tabIndex={0}>
        {children}
      </span>
    </Tooltip>
  );
}

/**
 * Everyone in the workspace. Admins can change roles, deactivate or reactivate people and
 * invite new ones; everyone else gets a read-only list.
 */
export function MembersTab({ me, org }: { me: User; org: Organization }) {
  const { data: users, error, isPending, refetch } = useUsers();
  const { data: teams = [] } = useTeams();
  const update = useUpdateMember();
  const toast = useToast();
  const [inviting, setInviting] = useState(false);
  const [deactivating, setDeactivating] = useState<User>();
  const isAdmin = me.role === 'admin';

  if (isPending) return <Skeleton lines={8} size="lg" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const activeAdmins = users.filter((u) => u.role === 'admin' && u.status === 'active');
  const teamsOf = (id: string) =>
    teams
      .filter((t) => t.members.some((m) => m.userId === id))
      .map((t) => t.name)
      .join(', ');

  const changeRole = (person: User, role: OrgRole) =>
    update.mutate(
      { id: person.id, patch: { role } },
      {
        onSuccess: () =>
          toast({
            title: `${person.name} is now ${ROLE_LABEL[role].toLowerCase()}`,
            description:
              role === 'guest'
                ? 'Guests aren’t on teams, so they were removed from theirs.'
                : undefined,
            tone: 'success',
          }),
        onError: (err) =>
          toast({ title: "Couldn't change the role", description: err.message, tone: 'danger' }),
      },
    );

  const reactivate = (person: User) =>
    update.mutate(
      { id: person.id, patch: { status: 'active' } },
      {
        onSuccess: () => toast({ title: `Reactivated ${person.name}`, tone: 'success' }),
        onError: (err) =>
          toast({ title: "Couldn't reactivate them", description: err.message, tone: 'danger' }),
      },
    );

  const roleReason = (person: User) => {
    if (person.id === me.id) return "You can't change your own role";
    if (person.status === 'deactivated') return 'Reactivate them to change their role';
    if (person.role === 'admin' && activeAdmins.length <= 1)
      return 'Birdy needs at least one admin';
    return undefined;
  };
  const statusReason = (person: User) => {
    if (person.id === me.id) return "You can't deactivate yourself";
    if (person.status !== 'deactivated' && person.role === 'admin' && activeAdmins.length <= 1)
      return 'Birdy needs at least one admin';
    return undefined;
  };

  return (
    <div className={styles.stack}>
      {isAdmin ? (
        <div className={styles.toolbar}>
          <p className={styles.note}>
            {org.name} has {users.length} people. Role changes take effect right away.
          </p>
          <Button variant="primary" icon={<UserPlus />} onClick={() => setInviting(true)}>
            Invite member
          </Button>
        </div>
      ) : (
        <Notice>Only workspace admins can manage members. You can see who is here.</Notice>
      )}

      <Card padding="none">
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Person</th>
                <th scope="col">Role</th>
                <th scope="col">Teams</th>
                <th scope="col">Status</th>
                {isAdmin && (
                  <th scope="col">
                    <span className={styles.srOnly}>Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((person) => {
                const status = STATUS[person.status];
                const reason = statusReason(person);
                return (
                  <tr key={person.id} data-status={person.status}>
                    <td>
                      <div className={styles.person}>
                        <Avatar user={person} size="md" />
                        <span className={styles.personText}>
                          <Link to={`/people/${person.id}`} className={styles.name}>
                            {person.name}
                            {person.id === me.id && ' (you)'}
                          </Link>
                          <span className={styles.muted}>{person.email}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      {isAdmin ? (
                        <WithReason reason={roleReason(person)}>
                          <Select
                            aria-label={`Role for ${person.name}`}
                            value={person.role}
                            disabled={!!roleReason(person)}
                            onChange={(e) => changeRole(person, e.target.value as OrgRole)}
                          >
                            <option value="admin">Workspace admin</option>
                            <option value="member">Member</option>
                            <option value="guest">Guest</option>
                          </Select>
                        </WithReason>
                      ) : (
                        <span>{ROLE_LABEL[person.role]}</span>
                      )}
                    </td>
                    <td className={styles.muted}>
                      {teamsOf(person.id) ||
                        (person.role === 'guest' ? person.company : 'No teams')}
                    </td>
                    <td>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </td>
                    {isAdmin && (
                      <td className={styles.actions}>
                        <WithReason reason={reason}>
                          {person.status === 'deactivated' ? (
                            <Button
                              size="sm"
                              onClick={() => reactivate(person)}
                              aria-label={`Reactivate ${person.name}`}
                            >
                              Reactivate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={!!reason}
                              onClick={() => setDeactivating(person)}
                              aria-label={`Deactivate ${person.name}`}
                            >
                              Deactivate
                            </Button>
                          )}
                        </WithReason>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {isAdmin && (
        <>
          <InviteMemberDialog
            open={inviting}
            onClose={() => setInviting(false)}
            domain={org.domain}
          />
          <DeactivateDialog person={deactivating} onClose={() => setDeactivating(undefined)} />
        </>
      )}
    </div>
  );
}

function DeactivateDialog({ person, onClose }: { person?: User; onClose: () => void }) {
  const update = useUpdateMember();
  const toast = useToast();
  const { data: teams = [] } = useTeams();
  const [error, setError] = useState<string>();
  const close = () => {
    setError(undefined);
    update.reset();
    onClose();
  };
  const memberOf = person ? teams.filter((t) => t.members.some((m) => m.userId === person.id)) : [];
  const confirm = () => {
    if (!person) return;
    update.mutate(
      { id: person.id, patch: { status: 'deactivated' } },
      {
        onSuccess: () => {
          toast({ title: `Deactivated ${person.name}`, tone: 'success' });
          close();
        },
        onError: (err) => setError(err.message),
      },
    );
  };
  return (
    <Dialog
      open={!!person}
      onOpenChange={(o) => !o && close()}
      title={`Deactivate ${person?.name ?? ''}?`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} loading={update.isPending}>
            Deactivate
          </Button>
        </>
      }
    >
      <ul className={styles.consequences}>
        <li>They can no longer sign in, and they won’t appear in pickers or @mentions.</li>
        <li>
          {memberOf.length > 0
            ? `They’ll be removed from ${memberOf.map((t) => t.name).join(', ')}.`
            : 'They aren’t on any teams.'}
        </li>
        <li>Their tasks stay assigned to them, and their files and history are kept.</li>
        <li>You can reactivate them later.</li>
      </ul>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </Dialog>
  );
}

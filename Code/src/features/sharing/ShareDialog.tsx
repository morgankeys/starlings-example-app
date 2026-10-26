import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Link2, Lock, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { sharesApi } from '@/api/endpoints';
import { keys } from '@/api/keys';
import { useSession } from '@/app/session';
import {
  Avatar,
  Button,
  Dialog,
  Dot,
  ErrorState,
  Notice,
  Select,
  Skeleton,
  useToast,
} from '@/components/ui';
import type { AccessLevel, GeneralAccess, ShareGrant, ShareSettings } from '@/domain/types';
import { useTeams, useUserMap } from '@/features/org/api';
import styles from './ShareDialog.module.css';

export interface ShareTarget {
  type: 'file' | 'folder';
  id: string;
  name: string;
}

const GENERAL_LABEL: Record<GeneralAccess, string> = {
  restricted: 'Restricted',
  org_view: 'Anyone at the company can view',
  org_edit: 'Anyone at the company can edit',
};

export function ShareDialog({
  target,
  onClose,
}: {
  target: ShareTarget | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={!!target}
      onOpenChange={(o) => !o && onClose()}
      title={`Share “${target?.name ?? ''}”`}
    >
      {target && <ShareBody target={target} onClose={onClose} />}
    </Dialog>
  );
}

function ShareBody({ target, onClose }: { target: ShareTarget; onClose: () => void }) {
  const { org } = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const users = useUserMap();
  const { data: teams = [] } = useTeams();
  const { data, error, isPending, refetch } = useQuery({
    queryKey: keys.share(target.type, target.id),
    queryFn: () => sharesApi.get(target.type, target.id),
  });
  const save = useMutation({
    mutationFn: (input: { generalAccess: GeneralAccess; grants: ShareGrant[] }) =>
      sharesApi.update(target.type, target.id, input),
    onSuccess: (next) => {
      qc.setQueryData(keys.share(target.type, target.id), next);
      qc.invalidateQueries({ queryKey: keys.allFolders });
      qc.invalidateQueries({ queryKey: keys.allFiles });
      qc.invalidateQueries({ queryKey: keys.notifications });
      qc.invalidateQueries({ queryKey: keys.allActivity });
    },
    onError: (err) =>
      toast({ title: "Couldn't update sharing", description: err.message, tone: 'danger' }),
  });
  const [principal, setPrincipal] = useState('');
  const [level, setLevel] = useState<AccessLevel>('view');

  if (isPending) return <Skeleton lines={5} />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!data) return null;

  const update = (patch: Partial<Pick<ShareSettings, 'generalAccess' | 'grants'>>) =>
    save.mutate({
      generalAccess: patch.generalAccess ?? data.generalAccess,
      grants: patch.grants ?? data.grants,
    });

  const granted = new Set(data.grants.map((g) => `${g.principalType}:${g.principalId}`));
  const availableTeams = teams.filter((t) => !granted.has(`team:${t.id}`));
  const availableUsers = [...users.values()].filter(
    (u) => u.status !== 'deactivated' && !granted.has(`user:${u.id}`) && u.id !== data.ownerId,
  );

  const add = () => {
    if (!principal) return;
    const [principalType, principalId] = principal.split(':') as ['user' | 'team', string];
    update({ grants: [...data.grants, { principalType, principalId, level }] });
    setPrincipal('');
  };

  const owner = users.get(data.ownerId);
  const copyLink = () => {
    const url = `${window.location.origin}/files${target.type === 'folder' ? `/folders/${target.id}` : `?file=${target.id}`}`;
    navigator.clipboard?.writeText(url);
    toast({
      title: 'Link copied',
      description:
        data.generalAccess === 'restricted' ? 'Only people with access can open it.' : undefined,
    });
  };

  return (
    <div className={styles.body}>
      {!data.canManage && (
        <Notice icon={<Lock />}>
          You can see who has access. Only people who can edit can change it.
        </Notice>
      )}

      {data.canManage && (
        <div className={styles.add}>
          <Select
            aria-label="Person or team"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
          >
            <option value="">Add people or teams…</option>
            {availableTeams.length > 0 && (
              <optgroup label="Teams">
                {availableTeams.map((t) => (
                  <option key={t.id} value={`team:${t.id}`}>
                    {t.name} ({t.members.length})
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="People">
              {availableUsers.map((u) => (
                <option key={u.id} value={`user:${u.id}`}>
                  {u.name}
                  {u.role === 'guest' ? ` (guest, ${u.company})` : ''}
                </option>
              ))}
            </optgroup>
          </Select>
          <Select
            aria-label="Access level"
            value={level}
            onChange={(e) => setLevel(e.target.value as AccessLevel)}
          >
            <option value="view">Can view</option>
            <option value="edit">Can edit</option>
          </Select>
          <Button icon={<UserPlus />} onClick={add} disabled={!principal} loading={save.isPending}>
            Add
          </Button>
        </div>
      )}

      <section className={styles.section}>
        <h3 className={styles.heading}>People with access</h3>
        <ul className={styles.list}>
          {owner && (
            <li className={styles.row}>
              <Avatar user={owner} size="md" />
              <span className={styles.who}>
                <span className={styles.name}>{owner.name}</span>
                <span className={styles.sub}>{owner.email}</span>
              </span>
              <span className={styles.level}>Owner</span>
            </li>
          )}
          {data.grants.map((g) => {
            const team =
              g.principalType === 'team' ? teams.find((t) => t.id === g.principalId) : undefined;
            const user = g.principalType === 'user' ? users.get(g.principalId) : undefined;
            return (
              <li key={`${g.principalType}:${g.principalId}`} className={styles.row}>
                {user ? (
                  <Avatar user={user} size="md" />
                ) : (
                  <span className={styles.teamIcon}>
                    <Users aria-hidden />
                  </span>
                )}
                <span className={styles.who}>
                  <span className={styles.name}>
                    {team && <Dot color={team.color} />}
                    {user?.name ?? team?.name ?? 'Unknown'}
                  </span>
                  <span className={styles.sub}>
                    {user
                      ? user.role === 'guest'
                        ? `Guest · ${user.company}`
                        : user.email
                      : `${team?.members.length ?? 0} members`}
                  </span>
                </span>
                {data.canManage ? (
                  <Select
                    aria-label={`Access for ${user?.name ?? team?.name}`}
                    value={g.level}
                    onChange={(e) => {
                      const v = e.target.value;
                      update({
                        grants:
                          v === 'remove'
                            ? data.grants.filter((x) => x !== g)
                            : data.grants.map((x) =>
                                x === g ? { ...x, level: v as AccessLevel } : x,
                              ),
                      });
                    }}
                  >
                    <option value="view">Can view</option>
                    <option value="edit">Can edit</option>
                    <option value="remove">Remove access</option>
                  </Select>
                ) : (
                  <span className={styles.level}>
                    {g.level === 'edit' ? 'Can edit' : 'Can view'}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {data.inherited.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.heading}>Access from folders above</h3>
          <ul className={styles.list}>
            {data.inherited.map((e, i) => {
              const team =
                e.principalType === 'team' ? teams.find((t) => t.id === e.principalId) : undefined;
              const user = e.principalType === 'user' ? users.get(e.principalId) : undefined;
              const label =
                e.principalType === 'org'
                  ? `Everyone at ${org.name}`
                  : (user?.name ?? team?.name ?? 'Unknown');
              return (
                <li key={i} className={styles.row} data-inherited="true">
                  <span className={styles.teamIcon}>
                    {e.principalType === 'org' ? <Building2 aria-hidden /> : <Users aria-hidden />}
                  </span>
                  <span className={styles.who}>
                    <span className={styles.name}>{label}</span>
                    <span className={styles.sub}>From “{e.inheritedFrom?.name}”</span>
                  </span>
                  <span className={styles.level}>
                    {e.level === 'edit' ? 'Can edit' : 'Can view'}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className={styles.section}>
        <h3 className={styles.heading}>General access</h3>
        <div className={styles.general}>
          <span className={styles.teamIcon}>
            {data.generalAccess === 'restricted' ? <Lock aria-hidden /> : <Building2 aria-hidden />}
          </span>
          {data.canManage ? (
            <Select
              aria-label="General access"
              value={data.generalAccess}
              onChange={(e) => update({ generalAccess: e.target.value as GeneralAccess })}
            >
              {(Object.keys(GENERAL_LABEL) as GeneralAccess[]).map((g) => (
                <option key={g} value={g}>
                  {GENERAL_LABEL[g].replace('the company', org.name)}
                </option>
              ))}
            </Select>
          ) : (
            <span>{GENERAL_LABEL[data.generalAccess].replace('the company', org.name)}</span>
          )}
        </div>
        <p className={styles.sub}>
          {data.generalAccess === 'restricted'
            ? 'Only the people and teams above can open it.'
            : 'Guests from outside the company still need to be added by name.'}
        </p>
      </section>

      <footer className={styles.footer}>
        <Button icon={<Link2 />} onClick={copyLink}>
          Copy link
        </Button>
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </footer>
    </div>
  );
}

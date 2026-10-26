import { Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Avatar,
  Badge,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  Skeleton,
} from '@/components/ui';
import { useTeams, useUsers } from '@/features/org/api';
import styles from './PeoplePage.module.css';

export function PeoplePage() {
  const { data: users, error, isPending, refetch } = useUsers();
  const { data: teams = [] } = useTeams();
  const [q, setQ] = useState('');
  const [team, setTeam] = useState('');

  const filtered = useMemo(() => {
    const members = team
      ? new Set(teams.find((t) => t.id === team)?.members.map((m) => m.userId))
      : null;
    const needle = q.trim().toLowerCase();
    return (users ?? []).filter(
      (u) =>
        (!members || members.has(u.id)) &&
        (!needle || `${u.name} ${u.title} ${u.email}`.toLowerCase().includes(needle)),
    );
  }, [users, teams, q, team]);

  const teamsOf = (userId: string) =>
    teams.filter((t) => t.members.some((m) => m.userId === userId));

  return (
    <>
      <PageHeader
        title="People"
        description={
          users ? `${users.length} people in your workspace, including guests.` : undefined
        }
      />
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Search aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, title or email"
            aria-label="Search people"
          />
        </div>
        <div className={styles.filter}>
          <Select
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            aria-label="Filter by team"
          >
            <option value="">All teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {isPending && <Skeleton lines={8} size="lg" />}
      {error && <ErrorState error={error} onRetry={refetch} />}
      {users && filtered.length === 0 && (
        <EmptyState
          icon={<Users />}
          title="No one matches"
          description="Try a different name or team."
        />
      )}
      <ul className={styles.grid}>
        {filtered.map((u) => (
          <li key={u.id}>
            <Link to={`/people/${u.id}`} className={styles.card}>
              <Avatar user={u} size="md" />
              <span className={styles.text}>
                <span className={styles.name}>
                  {u.name}
                  {u.role === 'admin' && <Badge tone="info">Admin</Badge>}
                  {u.role === 'guest' && <Badge tone="warning">Guest</Badge>}
                  {u.status === 'deactivated' && <Badge tone="danger">Deactivated</Badge>}
                  {u.status === 'invited' && <Badge tone="neutral">Invited</Badge>}
                </span>
                <span className={styles.title}>
                  {u.role === 'guest' ? `${u.title} · ${u.company}` : u.title}
                </span>
                <span className={styles.teams}>
                  {teamsOf(u.id)
                    .map((t) => t.name)
                    .join(', ') || u.location}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

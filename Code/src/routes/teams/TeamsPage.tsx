import { Plus, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '@/app/session';
import {
  AvatarStack,
  Button,
  Dot,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
} from '@/components/ui';
import { useTeams, useUserMap } from '@/features/org/api';
import { NewTeamDialog } from '@/features/org/TeamDialogs';
import styles from './TeamsPage.module.css';

export function TeamsPage() {
  const { user } = useSession();
  const { data, error, isPending, refetch } = useTeams();
  const users = useUserMap();
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHeader
        title="Teams"
        description="Teams share folders and plan work together."
        actions={
          user.role !== 'guest' && (
            <Button variant="primary" icon={<Plus />} onClick={() => setOpen(true)}>
              New team
            </Button>
          )
        }
      />
      {isPending && <Skeleton lines={6} size="lg" />}
      {error && <ErrorState error={error} onRetry={refetch} />}
      {data?.length === 0 && (
        <EmptyState
          icon={<Users />}
          title="No teams yet"
          description="Create a team to share folders and plan work together."
        />
      )}
      <ul className={styles.grid}>
        {data?.map((t) => (
          <li key={t.id}>
            <Link to={`/teams/${t.id}`} className={styles.card}>
              <span className={styles.name}>
                <Dot color={t.color} />
                {t.name}
              </span>
              <span className={styles.description}>{t.description}</span>
              <span className={styles.footer}>
                <AvatarStack users={t.members.map((m) => users.get(m.userId)).filter((u) => !!u)} />
                <span className={styles.stat}>
                  {t.members.length} members · {t.openTaskCount} open tasks
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <NewTeamDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

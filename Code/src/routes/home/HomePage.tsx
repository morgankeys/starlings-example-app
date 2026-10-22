import { CheckSquare, FolderClosed, Share2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useSession } from '@/app/session';
import {
  Card,
  Dot,
  EmptyState,
  ErrorState,
  LinkButton,
  PageHeader,
  Skeleton,
} from '@/components/ui';
import { FocusCard } from '@/features/assistant/FocusCard';
import { useFiles } from '@/features/files/api';
import { FileList } from '@/features/files/FileList';
import { useTeams } from '@/features/org/api';
import { useTasks } from '@/features/tasks/api';
import { groupByDue } from '@/features/tasks/grouping';
import { QuickAdd } from '@/features/tasks/QuickAdd';
import { TaskGroups } from '@/features/tasks/TaskGroups';
import { greeting } from '@/lib/dates';
import styles from './HomePage.module.css';

/** The landing page: today's work first, files second. */
export function HomePage() {
  const { user } = useSession();
  const tasks = useTasks({ assignee: 'me', includeDone: false });
  const groups = groupByDue(tasks.data ?? []).map((g) =>
    g.id === 'later' || g.id === 'none' ? { ...g, collapsed: true } : g,
  );
  const isGuest = user.role === 'guest';

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow={format(new Date(), 'EEEE, MMMM d')}
        title={`${greeting()}, ${user.name.split(' ')[0]}`}
      />
      <div className={styles.grid}>
        <div className={styles.main}>
          {!isGuest && <FocusCard />}
          <Card
            title="My work"
            icon={<CheckSquare />}
            actions={
              <LinkButton to="/tasks" size="sm" variant="ghost">
                View all
              </LinkButton>
            }
          >
            <div className={styles.work}>
              {!isGuest && <QuickAdd />}
              {tasks.isPending && <Skeleton lines={6} size="lg" />}
              {tasks.error && <ErrorState error={tasks.error} onRetry={tasks.refetch} />}
              {tasks.data?.length === 0 && (
                <EmptyState
                  icon={<CheckSquare />}
                  title="Nothing assigned to you"
                  description="Tasks assigned to you show up here, grouped by when they're due."
                />
              )}
              {!!tasks.data?.length && <TaskGroups groups={groups} hideAssignee />}
            </div>
          </Card>
        </div>
        <aside className={styles.side} aria-label="Files and teams">
          <RecentFiles />
          <SharedWithMe />
          {!isGuest && <MyTeams />}
        </aside>
      </div>
    </div>
  );
}

function RecentFiles() {
  const { data, error, isPending, refetch } = useFiles('recent', 5);
  return (
    <Card
      title="Recent files"
      icon={<FolderClosed />}
      padding="none"
      actions={
        <LinkButton to="/files/recent" size="sm" variant="ghost">
          All
        </LinkButton>
      }
    >
      <div className={styles.cardBody}>
        {isPending && <Skeleton lines={4} />}
        {error && <ErrorState error={error} onRetry={refetch} compact />}
        {data?.length === 0 && (
          <EmptyState
            size="sm"
            title="No recent files"
            description="Files you open or edit show up here."
          />
        )}
        {data && <FileList files={data} />}
      </div>
    </Card>
  );
}

function SharedWithMe() {
  const { data, error, isPending, refetch } = useFiles('shared', 4);
  return (
    <Card
      title="Shared with you"
      icon={<Share2 />}
      padding="none"
      actions={
        <LinkButton to="/files/shared" size="sm" variant="ghost">
          All
        </LinkButton>
      }
    >
      <div className={styles.cardBody}>
        {isPending && <Skeleton lines={3} />}
        {error && <ErrorState error={error} onRetry={refetch} compact />}
        {data?.length === 0 && <EmptyState size="sm" title="Nothing shared with you yet" />}
        {data && <FileList files={data} show="owner" />}
      </div>
    </Card>
  );
}

function MyTeams() {
  const { data, error, isPending, refetch } = useTeams(true);
  return (
    <Card title="Your teams" icon={<Users />} padding="none">
      <div className={styles.cardBody}>
        {isPending && <Skeleton lines={2} />}
        {error && <ErrorState error={error} onRetry={refetch} compact />}
        {data?.length === 0 && (
          <EmptyState
            size="sm"
            title="You're not on a team"
            description={<Link to="/teams">Browse teams</Link>}
          />
        )}
        <ul className={styles.teams}>
          {data?.map((t) => (
            <li key={t.id}>
              <Link to={`/teams/${t.id}`} className={styles.team}>
                <Dot color={t.color} />
                <span className={styles.teamName}>{t.name}</span>
                <span className={styles.teamCount}>{t.openTaskCount} open</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

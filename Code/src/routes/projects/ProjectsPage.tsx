import { FolderKanban } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dot, EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui';
import { useProjects, useTeams } from '@/features/org/api';
import styles from './ProjectsPage.module.css';

export function ProjectsPage() {
  const { data, error, isPending, refetch } = useProjects();
  const { data: teams = [] } = useTeams();
  return (
    <>
      <PageHeader title="Projects" description="Cross-team work with its own tasks and folder." />
      {isPending && <Skeleton lines={6} size="lg" />}
      {error && <ErrorState error={error} onRetry={refetch} />}
      {data?.length === 0 && <EmptyState icon={<FolderKanban />} title="No projects yet" />}
      <ul className={styles.list}>
        {data?.map((p) => {
          const total = p.openTaskCount + p.doneTaskCount;
          const pct = total ? Math.round((p.doneTaskCount / total) * 100) : 0;
          return (
            <li key={p.id}>
              <Link to={`/projects/${p.id}`} className={styles.card}>
                <span className={styles.name}>
                  <Dot color={p.color} />
                  {p.name}
                </span>
                <span className={styles.description}>{p.description}</span>
                <span className={styles.meta}>
                  <span>{teams.find((t) => t.id === p.teamId)?.name}</span>
                  <span>
                    {p.doneTaskCount} of {total} done
                  </span>
                </span>
                <progress
                  className={styles.progress}
                  data-color={p.color}
                  max={100}
                  value={pct}
                  aria-label={`${pct}% complete`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

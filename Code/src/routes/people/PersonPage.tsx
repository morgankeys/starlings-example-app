import { Mail, MapPin, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useSession } from '@/app/session';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Dot,
  ErrorState,
  PageHeader,
  Skeleton,
} from '@/components/ui';
import { useAssistant, useAssistantContext } from '@/features/assistant/AssistantProvider';
import { useTeams, useUser } from '@/features/org/api';
import { TasksView } from '@/features/tasks/TasksView';
import styles from './PersonPage.module.css';

export function PersonPage() {
  const { userId = '' } = useParams();
  const { user: me } = useSession();
  const { data: person, error, isPending, refetch } = useUser(userId);
  const { data: teams = [] } = useTeams();
  const assistant = useAssistant();
  useAssistantContext(person ? { type: 'person', id: person.id, label: person.name } : null);

  if (isPending) return <Skeleton lines={6} size="lg" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const theirTeams = teams.filter((t) => t.members.some((m) => m.userId === person.id));
  const isMe = person.id === me.id;
  const deactivated = person.status === 'deactivated';

  return (
    <>
      <PageHeader
        leading={<Avatar user={person} size="lg" />}
        eyebrow={
          person.role === 'guest'
            ? `Guest from ${person.company}`
            : person.role === 'admin'
              ? 'Workspace admin'
              : 'Member'
        }
        title={
          <>
            {isMe ? `${person.name} (you)` : person.name}
            {deactivated && <Badge tone="danger">Deactivated</Badge>}
          </>
        }
        description={person.title}
        actions={
          !isMe &&
          !deactivated && (
            <Button
              variant="ai"
              icon={<Sparkles />}
              onClick={() =>
                assistant.askAbout(
                  { type: 'person', id: person.id, label: person.name },
                  `What is ${person.name.split(' ')[0]} working on this week?`,
                )
              }
            >
              What’s {person.name.split(' ')[0]} working on?
            </Button>
          )
        }
      />
      <div className={styles.grid}>
        <section className={styles.main} aria-label={`${person.name}'s tasks`}>
          <h2 className={styles.heading}>Open tasks</h2>
          <TasksView
            base={{ assignee: person.id, includeDone: false }}
            hideAssignee
            defaultGroup="due"
            canAdd={me.role !== 'guest' && !deactivated}
            quickAddDefaults={{ assigneeId: person.id }}
            emptyTitle={`${person.name.split(' ')[0]} has no open tasks`}
          />
        </section>
        <aside className={styles.side}>
          <Card title="Contact">
            <dl className={styles.details}>
              <dt>
                <Mail aria-label="Email" />
              </dt>
              <dd>
                <a href={`mailto:${person.email}`} className={styles.link}>
                  {person.email}
                </a>
              </dd>
              <dt>
                <MapPin aria-label="Location" />
              </dt>
              <dd>{person.location}</dd>
            </dl>
          </Card>
          <Card title="Teams">
            {theirTeams.length === 0 ? (
              <p className={styles.muted}>
                {person.role === 'guest' ? 'Guests aren’t on teams.' : 'Not on a team yet.'}
              </p>
            ) : (
              <ul className={styles.teams}>
                {theirTeams.map((t) => (
                  <li key={t.id}>
                    <Link to={`/teams/${t.id}`} className={styles.team}>
                      <Dot color={t.color} />
                      {t.name}
                      {t.members.find((m) => m.userId === person.id)?.role === 'lead' && (
                        <Badge tone="neutral">Lead</Badge>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
